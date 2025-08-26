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

// Books
module.exports.listBooks    = (_req, res) => handle(res, svc.listBooks());
module.exports.createBook   = (req, res)  => svc.createBook(req.body)
  .then(b => res.status(201).json(b))
  .catch(err => res.status(err.status || 500).json({ error: err.message || 'Internal error' }));
module.exports.getBook      = (req, res)  => handle(res, svc.getBook(req.params.bookId));
module.exports.updateBook   = (req, res)  => handle(res, svc.updateBook(req.params.bookId, req.body));
module.exports.deleteBook   = (req, res)  => handle(res, svc.deleteBook(req.params.bookId));

// Authors
module.exports.listAuthors  = (_req, res) => handle(res, svc.listAuthors());
module.exports.createAuthor = (req, res)  => svc.createAuthor(req.body)
  .then(a => res.status(201).json(a))
  .catch(err => res.status(err.status || 500).json({ error: err.message || 'Internal error' }));
module.exports.getAuthor    = (req, res)  => handle(res, svc.getAuthor(req.params.authorId));
module.exports.updateAuthor = (req, res)  => handle(res, svc.updateAuthor(req.params.authorId, req.body));
module.exports.deleteAuthor = (req, res)  => handle(res, svc.deleteAuthor(req.params.authorId));

// Publishers
module.exports.listPublishers  = (_req, res) => handle(res, svc.listPublishers());
module.exports.createPublisher = (req, res)  => svc.createPublisher(req.body)
  .then(p => res.status(201).json(p))
  .catch(err => res.status(err.status || 500).json({ error: err.message || 'Internal error' }));
module.exports.getPublisher    = (req, res)  => handle(res, svc.getPublisher(req.params.publisherId));
module.exports.updatePublisher = (req, res)  => handle(res, svc.updatePublisher(req.params.publisherId, req.body));
module.exports.deletePublisher = (req, res)  => handle(res, svc.deletePublisher(req.params.publisherId));
