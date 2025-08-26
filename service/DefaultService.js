'use strict';
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
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

function findById(arr, id)   { return arr.find(i => i.id == id); }
function existsById(arr, id) { return arr.some(i => i.id == id); }

loadAll();

// Books
exports.listBooks = async () => books;

exports.createBook = async (body) => {
  if (!body || !body.id) throw { status: 400, message: "Book debe incluir 'id'." };
  if (existsById(books, body.id)) throw { status: 409, message: 'Book id duplicado.' };
  if (body.authorId && !existsById(authors, body.authorId)) throw { status: 400, message: 'authorId no existe.' };
  if (body.publisherId && !existsById(publishers, body.publisherId)) throw { status: 400, message: 'publisherId no existe.' };
  books.push(body); save('books'); return body;
};

exports.getBook = async (bookId) => findById(books, bookId) || null;

exports.updateBook = async (bookId, body) => {
  const idx = books.findIndex(i => i.id == bookId);
  if (idx === -1) return null;
  if (body.authorId && !existsById(authors, body.authorId)) throw { status: 400, message: 'authorId no existe.' };
  if (body.publisherId && !existsById(publishers, body.publisherId)) throw { status: 400, message: 'publisherId no existe.' };
  body.id = bookId; // ID por ruta
  books[idx] = body;
  save('books'); return body;
};

exports.deleteBook = async (bookId) => {
  const before = books.length;
  books = books.filter(i => i.id != bookId);
  if (books.length === before) return false;
  save('books'); return true;
};

// Authors
exports.listAuthors = async () => authors;

exports.createAuthor = async (body) => {
  if (!body || !body.id) throw { status: 400, message: "Author debe incluir 'id'." };
  if (existsById(authors, body.id)) throw { status: 409, message: 'Author id duplicado.' };
  authors.push(body); save('authors'); return body;
};

exports.getAuthor = async (authorId) => findById(authors, authorId) || null;

exports.updateAuthor = async (authorId, body) => {
  const idx = authors.findIndex(i => i.id == authorId);
  if (idx === -1) return null;
  body.id = authorId;
  authors[idx] = body; save('authors'); return body;
};

exports.deleteAuthor = async (authorId) => {
  const related = books.some(b => b.authorId == authorId);
  if (related) throw { status: 409, message: 'No se puede borrar: tiene libros asociados.' };
  const before = authors.length;
  authors = authors.filter(i => i.id != authorId);
  if (authors.length === before) return false;
  save('authors'); return true;
};

// Publishers
exports.listPublishers = async () => publishers;

exports.createPublisher = async (body) => {
  if (!body || !body.id) throw { status: 400, message: "Publisher debe incluir 'id'." };
  if (existsById(publishers, body.id)) throw { status: 409, message: 'Publisher id duplicado.' };
  publishers.push(body); save('publishers'); return body;
};

exports.getPublisher = async (publisherId) => findById(publishers, publisherId) || null;

exports.updatePublisher = async (publisherId, body) => {
  const idx = publishers.findIndex(i => i.id == publisherId);
  if (idx === -1) return null;
  body.id = publisherId;
  publishers[idx] = body; save('publishers'); return body;
};

exports.deletePublisher = async (publisherId) => {
  const related = books.some(b => b.publisherId == publisherId);
  if (related) throw { status: 409, message: 'No se puede borrar: tiene libros asociados.' };
  const before = publishers.length;
  publishers = publishers.filter(i => i.id != publisherId);
  if (publishers.length === before) return false;
  save('publishers'); return true;
};
