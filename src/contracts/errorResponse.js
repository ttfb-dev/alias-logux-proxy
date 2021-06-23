class ErrorResponse {
  constructor(code, message, meta = {}) {
    this.code = code;
    this.message = message;
    this.meta = meta;
  }
}

export default ErrorResponse;
