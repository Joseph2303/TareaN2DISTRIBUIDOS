'use strict';
const fs = require('fs');
const path = require('path');

const IS_NETLIFY = !!process.env.NETLIFY;

// dentro de ensureFiles():
if (IS_NETLIFY) {
  // Solo lee si existen; si no existen, usa defaults en memoria (no escribas al disco)
  authors = fs.existsSync(files.authors) ? JSON.parse(fs.readFileSync(files.authors, "utf8")) :
    [{ id:"a1", name:"Abraham Silberschatz", country:"USA" },{ id:"a2", name:"Haruki Murakami", country:"Japan" }];
  publishers = fs.existsSync(files.publishers) ? JSON.parse(fs.readFileSync(files.publishers, "utf8")) :
    [{ id:"p1", name:"John Wiley & Sons" },{ id:"p2", name:"Vintage" }];
  books = fs.existsSync(files.books) ? JSON.parse(fs.readFileSync(files.books, "utf8")) :
    [{ id:"b1", title:"Operating System Concepts", edition:"9th", copyright:2012, language:"ENGLISH", pages:976, authorId:"a1", publisherId:"p1" },
     { id:"b2", title:"Kafka on the Shore", edition:"1st", copyright:2002, language:"ENGLISH", pages:505, authorId:"a2", publisherId:"p2" }];
  return; // ¡no intentes fs.writeFileSync en Netlify!
}

// Permite sobreescribir la carpeta de datos en producción (Render, etc.)
const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
fs.mkdirSync(dataDir, { recursive: true });

const files = {
  books: path.join(dataDir, 'books.json'),
  authors: path.join(dataDir, 'authors.json'),
  publishers: path.join(dataDir, 'publishers.json')
};

let books = [];
let authors = [];
let publishers = [];

function ensureFiles() {
  if (!fs.existsSync(files.authors)) {
    fs.writeFileSync(files.authors, JSON.stringify([
      { id: 'a1', name: 'Abraham Silberschatz', country: 'USA' },
      { id: 'a2', name: 'Haruki Murakami', country: 'Japan' }
    ], null, 2));
  }
  if (!fs.existsSync(files.publishers)) {
    fs.writeFileSync(files.publishers, JSON.stringify([
      { id: 'p1', name: 'John Wiley & Sons' },
      { id: 'p2', name: 'Vintage' }
    ], null, 2));
  }
  if (!fs.existsSync(files.books)) {
    fs.writeFileSync(files.books, JSON.stringify([
      { id: 'b1', title: 'Operating System Concepts', edition: '9th', copyright: 2012,
        language: 'ENGLISH', pages: 976, authorId: 'a1', publisherId: 'p1' },
      { id: 'b2', title: 'Kafka on the Shore', edition: '1st', copyright: 2002,
        language: 'ENGLISH', pages: 505, authorId: 'a2', publisherId: 'p2' }
    ], null, 2));
  }
}

function loadAll() {
  ensureFiles();
  books = JSON.parse(fs.readFileSync(files.books, 'utf8'));
  authors = JSON.parse(fs.readFileSync(files.authors, 'utf8'));
  publishers = JSON.parse(fs.readFileSync(files.publishers, 'utf8'));
}

function save(type) {
  const map = { books, authors, publishers };
  fs.writeFileSync(files[type], JSON.stringify(map[type], null, 2));
}

function norm(v) { return String(v ?? '').trim().toLowerCase(); }
function idOfBook(b) { return b?.id ?? b?.bookId; }
function idOfAuthor(a) { return a?.id ?? a?.authorId; }
function idOfPublisher(p) { return p?.id ?? p?.publisherId; }

loadAll();

/* =========================
 * BOOKS
 * =======================*/

// GET /books (con filtros/orden/paginación)
exports.listBooks = async (params = {}) => {
  loadAll(); // <-- refresca siempre
  const {
    language, authorId, publisherId, title, q,
    sort = 'title',   // title | -title | copyright | -copyright | pages | -pages
    limit = 50, offset = 0,
  } = params;

  let result = [...books];

  // Filtros
  if (language) {
    result = result.filter(b => norm(b.language) === norm(language));
  }
  if (authorId) {
    result = result.filter(b => norm(b.authorId) === norm(authorId));
  }
  if (publisherId) {
    result = result.filter(b => norm(b.publisherId) === norm(publisherId));
  }
  if (title) {
    const needle = norm(title);
    result = result.filter(b => norm(b.title).includes(needle));
  }
  if (q) {
    const needle = norm(q);
    result = result.filter(b => {
      const hay = [b.title, b.language, b.authorId, b.publisherId]
        .map(v => norm(v)).join(' ');
      return hay.includes(needle);
    });
  }

  // Orden
  if (sort) {
    const desc = String(sort).startsWith('-');
    const field = desc ? String(sort).slice(1) : String(sort);
    const valid = ['title', 'copyright', 'pages'];
    if (valid.includes(field)) {
      result.sort((a, b) => {
        const va = a[field], vb = b[field];
        if (va == null && vb == null) return 0;
        if (va == null) return desc ? 1 : -1;
        if (vb == null) return desc ? -1 : 1;
        if (typeof va === 'number' && typeof vb === 'number') return desc ? vb - va : va - vb;
        return desc ? String(vb).localeCompare(String(va)) : String(va).localeCompare(String(vb));
      });
    }
  }

  // Paginación
  const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const off = Math.max(parseInt(offset, 10) || 0, 0);
  return result.slice(off, off + lim);
};

// POST /books
exports.createBook = async (body) => {
  loadAll(); // asegura consistencia
  if (!body || !body.id) throw { status: 400, message: "Book debe incluir 'id'." };
  if (books.some(b => norm(idOfBook(b)) === norm(body.id))) throw { status: 409, message: 'Book id duplicado.' };
  if (body.authorId && !authors.some(a => norm(idOfAuthor(a)) === norm(body.authorId))) throw { status: 400, message: 'authorId no existe.' };
  if (body.publisherId && !publishers.some(p => norm(idOfPublisher(p)) === norm(body.publisherId))) throw { status: 400, message: 'publisherId no existe.' };
  books.push(body); save('books'); return body;
};

// GET /books/{bookId} — lectura directa + logs
exports.getBook = async (bookId) => {
  console.log('bookId:', bookId);
  if (bookId == null) return null;
  try {
    const pathBooks = files.books;
    const disk = JSON.parse(fs.readFileSync(pathBooks, 'utf8'));
    const needle = String(bookId).trim().toLowerCase();
    const book = disk.find(b =>
      String((b.id ?? b.bookId) ?? '').trim().toLowerCase() === needle
    );
    console.log('[getBook]', { pathBooks, bookId, count: disk.length, found: !!book, ids: disk.map(x => x.id ?? x.bookId) });
    return book || null;
  } catch (e) {
    console.error('[getBook][error]', e);
    throw { status: 500, message: 'Error leyendo books.json' };
  }
};


// PUT /books/{bookId}
exports.updateBook = async (bookId, body) => {
  loadAll();
  const idx = books.findIndex(i => norm(i.id) === norm(bookId));
  if (idx === -1) return null;
  if (body.authorId && !authors.some(a => norm(idOfAuthor(a)) === norm(body.authorId))) throw { status: 400, message: 'authorId no existe.' };
  if (body.publisherId && !publishers.some(p => norm(idOfPublisher(p)) === norm(body.publisherId))) throw { status: 400, message: 'publisherId no existe.' };
  body.id = String(bookId); // ID por ruta
  books[idx] = body;
  save('books'); return body;
};

// DELETE /books/{bookId}
exports.deleteBook = async (bookId) => {
  loadAll();
  const before = books.length;
  books = books.filter(i => norm(i.id) !== norm(bookId));
  if (books.length === before) return false;
  save('books'); return true;
};

/* =========================
 * AUTHORS
 * =======================*/

// GET /authors (con filtros/orden/paginación)
exports.listAuthors = async (params = {}) => {
  loadAll();
  const { name, country, q, sort = 'name', limit = 50, offset = 0 } = params;

  let result = [...authors];

  if (name)    result = result.filter(a => norm(a.name).includes(norm(name)));
  if (country) result = result.filter(a => norm(a.country).includes(norm(country)));
  if (q) {
    const needle = norm(q);
    result = result.filter(a => [a.name, a.country].map(norm).join(' ').includes(needle));
  }

  if (sort) {
    const desc = String(sort).startsWith('-');
    const field = desc ? String(sort).slice(1) : String(sort);
    const valid = ['name','country'];
    if (valid.includes(field)) {
      result.sort((a, b) => {
        const va = a[field] ?? '';
        const vb = b[field] ?? '';
        return desc ? String(vb).localeCompare(String(va)) : String(va).localeCompare(String(vb));
      });
    }
  }

  const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const off = Math.max(parseInt(offset, 10) || 0, 0);
  return result.slice(off, off + lim);
};

// POST /authors
exports.createAuthor = async (body) => {
  loadAll();
  if (!body || !body.id) throw { status: 400, message: "Author debe incluir 'id'." };
  if (authors.some(a => norm(idOfAuthor(a)) === norm(body.id))) throw { status: 409, message: 'Author id duplicado.' };
  authors.push(body); save('authors'); return body;
};

// GET /authors/{authorId}
exports.getAuthor = async (authorId) => {
  if (authorId == null) return null;
  loadAll();
  const a = authors.find(x => norm(idOfAuthor(x)) === norm(authorId));
  return a || null;
};

// PUT /authors/{authorId}
exports.updateAuthor = async (authorId, body) => {
  loadAll();
  const idx = authors.findIndex(i => norm(i.id) === norm(authorId));
  if (idx === -1) return null;
  body.id = String(authorId);
  authors[idx] = body; save('authors'); return body;
};

// DELETE /authors/{authorId}
exports.deleteAuthor = async (authorId) => {
  loadAll();
  const related = books.some(b => norm(b.authorId) === norm(authorId));
  if (related) throw { status: 409, message: 'No se puede borrar: tiene libros asociados.' };
  const before = authors.length;
  authors = authors.filter(i => norm(i.id) !== norm(authorId));
  if (authors.length === before) return false;
  save('authors'); return true;
};

/* =========================
 * PUBLISHERS
 * =======================*/

// GET /publishers (con filtros/orden/paginación)
exports.listPublishers = async (params = {}) => {
  loadAll();
  const { name, q, sort = 'name', limit = 50, offset = 0 } = params;

  let result = [...publishers];

  if (name) result = result.filter(p => norm(p.name).includes(norm(name)));
  if (q) {
    const needle = norm(q);
    result = result.filter(p => norm(p.name).includes(needle));
  }

  if (sort) {
    const desc = String(sort).startsWith('-');
    const field = desc ? String(sort).slice(1) : String(sort);
    if (['name'].includes(field)) {
      result.sort((a, b) => {
        const va = a[field] ?? '';
        const vb = b[field] ?? '';
        return desc ? String(vb).localeCompare(String(va)) : String(va).localeCompare(String(vb));
      });
    }
  }

  const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const off = Math.max(parseInt(offset, 10) || 0, 0);
  return result.slice(off, off + lim);
};

// POST /publishers
exports.createPublisher = async (body) => {
  loadAll();
  if (!body || !body.id) throw { status: 400, message: "Publisher debe incluir 'id'." };
  if (publishers.some(p => norm(idOfPublisher(p)) === norm(body.id))) throw { status: 409, message: 'Publisher id duplicado.' };
  publishers.push(body); save('publishers'); return body;
};

// GET /publishers/{publisherId}
exports.getPublisher = async (publisherId) => {
  if (publisherId == null) return null;
  loadAll();
  const p = publishers.find(x => norm(idOfPublisher(x)) === norm(publisherId));
  return p || null;
};

// PUT /publishers/{publisherId}
exports.updatePublisher = async (publisherId, body) => {
  loadAll();
  const idx = publishers.findIndex(i => norm(i.id) === norm(publisherId));
  if (idx === -1) return null;
  body.id = String(publisherId);
  publishers[idx] = body; save('publishers'); return body;
};

// DELETE /publishers/{publisherId}
exports.deletePublisher = async (publisherId) => {
  loadAll();
  const related = books.some(b => norm(b.publisherId) === norm(publisherId));
  if (related) throw { status: 409, message: 'No se puede borrar: tiene libros asociados.' };
  const before = publishers.length;
  publishers = publishers.filter(i => norm(i.id) !== norm(publisherId));
  if (publishers.length === before) return false;
  save('publishers'); return true;
};
