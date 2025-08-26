'use strict';
const svc = require('../service/DefaultService');

function handle(res, promise) {
  promise
    .then((data) => {
      if (data === null || data === undefined) return res.status(404).json({ error: 'Not found' });
      if (typeof data === 'boolean') return res.status(data ? 204 : 404).send();
      return res.json(data);
    })
    .catch((err) => {
      const status = err && err.status ? err.status : 500;
      res.status(status).json({ error: err.message || 'Internal error' });
    });
}

// ========== Books ==========
module.exports.listBooks = (req, res) => {
  handle(res, svc.listBooks(req.query));
};

module.exports.createBook = (req, res) => {
  svc.createBook(req.body)
    .then(b => res.status(201).json(b))
    .catch(err => res.status(err.status || 500).json({ error: err.message || 'Internal error' }));
};

module.exports.getBook = (req, res) => {
  const bookId =
    req?.params?.bookId ??
    req?.openapi?.pathParams?.bookId ??
    req?.swagger?.params?.bookId?.value;
  handle(res, svc.getBook(bookId));
};

module.exports.updateBook = (req, res) => {
  const bookId =
    req?.params?.bookId ??
    req?.openapi?.pathParams?.bookId ??
    req?.swagger?.params?.bookId?.value;
  handle(res, svc.updateBook(bookId, req.body));
};

module.exports.deleteBook = (req, res) => {
  const bookId =
    req?.params?.bookId ??
    req?.openapi?.pathParams?.bookId ??
    req?.swagger?.params?.bookId?.value;
  handle(res, svc.deleteBook(bookId));
};

// ========== Authors ==========
module.exports.listAuthors = (req, res) => {
  handle(res, svc.listAuthors(req.query));
};

module.exports.createAuthor = (req, res) => {
  svc.createAuthor(req.body)
    .then(a => res.status(201).json(a))
    .catch(err => res.status(err.status || 500).json({ error: err.message || 'Internal error' }));
};

module.exports.getAuthor = (req, res) => {
  const authorId =
    req?.params?.authorId ??
    req?.openapi?.pathParams?.authorId ??
    req?.swagger?.params?.authorId?.value;
  handle(res, svc.getAuthor(authorId));
};

module.exports.updateAuthor = (req, res) => {
  const authorId =
    req?.params?.authorId ??
    req?.openapi?.pathParams?.authorId ??
    req?.swagger?.params?.authorId?.value;
  handle(res, svc.updateAuthor(authorId, req.body));
};

module.exports.deleteAuthor = (req, res) => {
  const authorId =
    req?.params?.authorId ??
    req?.openapi?.pathParams?.authorId ??
    req?.swagger?.params?.authorId?.value;
  handle(res, svc.deleteAuthor(authorId));
};

// ========== Publishers ==========
module.exports.listPublishers = (req, res) => {
  handle(res, svc.listPublishers(req.query));
};

module.exports.createPublisher = (req, res) => {
  svc.createPublisher(req.body)
    .then(p => res.status(201).json(p))
    .catch(err => res.status(err.status || 500).json({ error: err.message || 'Internal error' }));
};

module.exports.getPublisher = (req, res) => {
  const publisherId =
    req?.params?.publisherId ??
    req?.openapi?.pathParams?.publisherId ??
    req?.swagger?.params?.publisherId?.value;
  handle(res, svc.getPublisher(publisherId));
};

module.exports.updatePublisher = (req, res) => {
  const publisherId =
    req?.params?.publisherId ??
    req?.openapi?.pathParams?.publisherId ??
    req?.swagger?.params?.publisherId?.value;
  handle(res, svc.updatePublisher(publisherId, req.body));
};

module.exports.deletePublisher = (req, res) => {
  const publisherId =
    req?.params?.publisherId ??
    req?.openapi?.pathParams?.publisherId ??
    req?.swagger?.params?.publisherId?.value;
  handle(res, svc.deletePublisher(publisherId));
};
