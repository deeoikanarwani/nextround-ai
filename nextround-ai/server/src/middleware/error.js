import { ZodError } from 'zod';
import multer from 'multer';

export function notFound(req, res) {
  res.status(404).json({ error: 'Not found.' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message;
  if (err instanceof ZodError) { status = 400; message = 'Invalid input.'; }
  else if (err instanceof multer.MulterError) { status = 400; message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 2 MB).' : 'Invalid file upload.'; }
  else if (err.code === 11000) { status = 409; message = 'This record already exists.'; }
  else if (err.name === 'CastError') { status = 400; message = 'Invalid id.'; }
  else if (err.type === 'entity.too.large') { status = 413; message = 'Request is too large.'; }
  else if (err.type === 'entity.parse.failed') { status = 400; message = 'Malformed JSON body.'; }
  else if (!err.status) { console.error(err); message = 'Something went wrong on our side. Please try again.'; }
  res.status(status).json({ error: message, code: err.code });
}
