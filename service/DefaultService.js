'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const PKG_DATA_DIR = path.join(ROOT, 'data');     // empaquetado con el deploy (solo lectura en Netlify)

// 1) Elegimos un directorio de runtime para ESCRIBIR.
//    Intentamos usar DATA_DIR o data/; si no es escribible, caemos a /tmp/data.
function pickRuntimeDir() {
  const preferred = process.env.DATA_DIR || PKG_DATA_DIR;
  try {
    fs.mkdirSync(preferred, { recursive: true });
    fs.accessSync(preferred, fs.constants.W_OK);
    return preferred; // es escribible
  } catch {
    const tmpDir = path.join('/tmp', 'data');
    fs.mkdirSync(tmpDir, { recursive: true });
    return tmpDir; // Netlify Functions: escribible
  }
}

const RUNTIME_DATA_DIR = pickRuntimeDir();

const files = {
  books: path.join(RUNTIME_DATA_DIR, 'books.json'),
  authors: path.join(RUNTIME_DATA_DIR, 'authors.json'),
  publishers: path.join(RUNTIME_DATA_DIR, 'publishers.json'),
};
const pkgFiles = {
  books: path.join(PKG_DATA_DIR, 'books.json'),
  authors: path.join(PKG_DATA_DIR, 'authors.json'),
  publishers: path.join(PKG_DATA_DIR, 'publishers.json'),
};

let books = [];
let authors = [];
let publishers = [];

// Semillas por defecto (por si no existen ni en runtime ni en pkg)
const SEED = {
  authors: [
    { id: 'a1', name: 'Abraham Silberschatz', country: 'USA' },
    { id: 'a2', name: 'Haruki Murakami', country: 'Japan' },
  ],
  publishers: [
    { id: 'p1', name: 'John Wiley & Sons' },
    { id: 'p2', name: 'Vintage' },
  ],
  books: [
    {
      id: 'b1', title: 'Operating System Concepts', edition: '9th', copyright: 2012,
      language: 'ENGLISH', pages: 976, authorId: 'a1', publisherId: 'p1'
    },
    {
      id: 'b2', title: 'Kafka on the Shore', edition: '1st', copyright: 2002,
      language: 'ENGLISH', pages: 505, authorId: 'a2', publisherId: 'p2'
    },
  ],
};

/**
 * Asegura que existan datos en el directorio de runtime:
 * - Si ya existen en runtime → leer.
 * - Si no existen pero existen en pkg (bundle) → copiar pkg → runtime.
 * - Si no existen en ningún lado → crear desde SEED en runtime.
 */
function ensureFiles() {
  const hydrate = (name) => {
    const runtimePath = files[name];
    const pkgPath = pkgFiles[name];

    if (fs.existsSync(runtimePath)) {
      return JSON.parse(fs.readFileSync(runtimePath, 'utf8'));
    }
    if (fs.existsSync(pkgPath)) {
      const data = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      fs.writeFileSync(runtimePath, JSON.stringify(data, null, 2)); // runtime es escribible
      return data;
    }
    fs.writeFileSync(runtimePath, JSON.stringify(SEED[name], null, 2));
    return SEED[name];
  };

  authors = hydrate('authors');
  publishers = hydrate('publishers');
  books = hydrate('books');
}

function loadAll() {
  ensureFiles();
  // Después de asegurar, lee desde runtime (siempre)
  books = JSON.parse(fs.readFileSync(files.books, 'utf8'));
  authors = JSON.parse(fs.readFileSync(files.authors, 'utf8'));
  publishers = JSON.parse(fs.readFileSync(files.publishers, 'utf8'));
}

// Guardado SIEMPRE en el directorio runtime (local: data/, Netlify: /tmp/data)
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

exports.listBooks = async (params = {}) => {
  loadAll();
  const { language, authorId, publisherId, title, q, sort = 'title', limit = 50, offset = 0 } = params;

  let result = [...books];

  if (language)    result = result.filter(b => norm(b.language) === norm(language));
  if (authorId)    result = result.filter(b => norm(b.authorId) === norm(authorId));
  if (publisherId) result = result.filter(b => norm(b.publisherId) === norm(publisherId));
  if (title) {
    const n = norm(title);
    result = result.filter(b => norm(b.title).includes(n));
  }
  if (q) {
    const n = norm(q);
    result = result.filter(b =>
      [b.title, b.language, b.authorId, b.publisherId].map(norm).join(' ').includes(n)
    );
  }

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

  const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const off = Math.max(parseInt(offset, 10) || 0, 0);
  return result.slice(off, off + lim);
};

exports.createBook = async (body) => {
  loadAll();
  if (!body || !body.id) throw { status: 400, message: "Book debe incluir 'id'." };
  if (books.some(b => norm(idOfBook(b)) === norm(body.id))) throw { status: 409, message: 'Book id duplicado.' };
  if (body.authorId && !authors.some(a => norm(idOfAuthor(a)) === norm(body.authorId))) throw { status: 400, message: 'authorId no existe.' };
  if (body.publisherId && !publishers.some(p => norm(idOfPublisher(p)) === norm(body.publisherId))) throw { status: 400, message: 'publisherId no existe.' };
  books.push(body);
  save('books');      // ✅ en Netlify escribe a /tmp/data/books.json
  return body;
};

exports.getBook = async (bookId) => {
  if (bookId == null) return null;
  loadAll();
  const n = norm(bookId);
  const book = books.find(b => norm(idOfBook(b)) === n);
  return book || null;
};

exports.updateBook = async (bookId, body) => {
  loadAll();
  const idx = books.findIndex(i => norm(i.id) === norm(bookId));
  if (idx === -1) return null;
  if (body.authorId && !authors.some(a => norm(idOfAuthor(a)) === norm(body.authorId))) throw { status: 400, message: 'authorId no existe.' };
  if (body.publisherId && !publishers.some(p => norm(idOfPublisher(p)) === norm(body.publisherId))) throw { status: 400, message: 'publisherId no existe.' };
  body.id = String(bookId);
  books[idx] = body;
  save('books');
  return body;
};

exports.deleteBook = async (bookId) => {
  loadAll();
  const before = books.length;
  books = books.filter(i => norm(i.id) !== norm(bookId));
  if (books.length === before) return false;
  save('books');
  return true;
};

/* =========================
 * AUTHORS
 * =======================*/

exports.listAuthors = async (params = {}) => {
  loadAll();
  const { name, country, q, sort = 'name', limit = 50, offset = 0 } = params;

  let result = [...authors];
  if (name)    result = result.filter(a => norm(a.name).includes(norm(name)));
  if (country) result = result.filter(a => norm(a.country).includes(norm(country)));
  if (q) {
    const n = norm(q);
    result = result.filter(a => [a.name, a.country].map(norm).join(' ').includes(n));
  }

  if (sort) {
    const desc = String(sort).startsWith('-');
    const field = desc ? String(sort).slice(1) : String(sort);
    const valid = ['name', 'country'];
    if (valid.includes(field)) {
      result.sort((a, b) =>
        desc ? String(b[field] ?? '').localeCompare(String(a[field] ?? ''))
             : String(a[field] ?? '').localeCompare(String(b[field] ?? ''))
      );
    }
  }

  const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const off = Math.max(parseInt(offset, 10) || 0, 0);
  return result.slice(off, off + lim);
};

exports.createAuthor = async (body) => {
  loadAll();
  if (!body || !body.id) throw { status: 400, message: "Author debe incluir 'id'." };
  if (authors.some(a => norm(idOfAuthor(a)) === norm(body.id))) throw { status: 409, message: 'Author id duplicado.' };
  authors.push(body); save('authors'); return body;
};

exports.getAuthor = async (authorId) => {
  if (authorId == null) return null;
  loadAll();
  const a = authors.find(x => norm(idOfAuthor(x)) === norm(authorId));
  return a || null;
};

exports.updateAuthor = async (authorId, body) => {
  loadAll();
  const idx = authors.findIndex(i => norm(i.id) === norm(authorId));
  if (idx === -1) return null;
  body.id = String(authorId);
  authors[idx] = body; save('authors'); return body;
};

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

exports.listPublishers = async (params = {}) => {
  loadAll();
  const { name, q, sort = 'name', limit = 50, offset = 0 } = params;

  let result = [...publishers];
  if (name) result = result.filter(p => norm(p.name).includes(norm(name)));
  if (q) { const n = norm(q); result = result.filter(p => norm(p.name).includes(n)); }

  if (sort) {
    const desc = String(sort).startsWith('-');
    const field = desc ? String(sort).slice(1) : String(sort);
    if (['name'].includes(field)) {
      result.sort((a, b) =>
        desc ? String(b[field] ?? '').localeCompare(String(a[field] ?? ''))
             : String(a[field] ?? '').localeCompare(String(b[field] ?? ''))
      );
    }
  }

  const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const off = Math.max(parseInt(offset, 10) || 0, 0);
  return result.slice(off, off + lim);
};

exports.createPublisher = async (body) => {
  loadAll();
  if (!body || !body.id) throw { status: 400, message: "Publisher debe incluir 'id'." };
  if (publishers.some(p => norm(idOfPublisher(p)) === norm(body.id))) throw { status: 409, message: 'Publisher id duplicado.' };
  publishers.push(body); save('publishers'); return body;
};

exports.getPublisher = async (publisherId) => {
  if (publisherId == null) return null;
  loadAll();
  const p = publishers.find(x => norm(idOfPublisher(x)) === norm(publisherId));
  return p || null;
};

exports.updatePublisher = async (publisherId, body) => {
  loadAll();
  const idx = publishers.findIndex(i => norm(i.id) === norm(publisherId));
  if (idx === -1) return null;
  body.id = String(publisherId);
  publishers[idx] = body; save('publishers'); return body;
};

exports.deletePublisher = async (publisherId) => {
  loadAll();
  const related = books.some(b => norm(b.publisherId) === norm(publisherId));
  if (related) throw { status: 409, message: 'No se puede borrar: tiene libros asociados.' };
  const before = publishers.length;
  publishers = publishers.filter(i => norm(i.id) !== norm(publisherId));
  if (publishers.length === before) return false;
  save('publishers'); return true;
};
