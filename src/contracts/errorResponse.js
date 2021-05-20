class ErrorResponse {
    code = '';
    message = '';
    meta = {};

    constructor(code, message, meta = {}) {
        this.code = code;
        this.message = message;
        this.meta = meta;
    }
}

export default ErrorResponse;
