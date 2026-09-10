export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: {
    page: number;
    perPage: number;
    total: number;
  };
};

export type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
