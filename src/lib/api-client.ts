export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');
  
  if (!response.ok) {
    let errorMessage = 'An unexpected error occurred';
    let errorData: unknown;
    
    try {
      if (isJson) {
        errorData = await response.json();
        errorMessage = (errorData as { error?: string; message?: string })?.error || 
                      (errorData as { error?: string; message?: string })?.message || 
                      errorMessage;
      } else {
        errorMessage = await response.text() || errorMessage;
      }
    } catch {
      // If parsing fails, use default message
    }
    
    throw new ApiError(response.status, errorMessage, errorData);
  }

  if (isJson) {
    return response.json();
  }
  
  return response.text() as T;
}

export async function get<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    return handleResponse<T>(response);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, 'Network error. Please check your connection.');
  }
}

export async function post<T>(url: string, data: unknown, options?: RequestInit): Promise<T> {
  try {
    const isFormData = data instanceof FormData;
    
    const response = await fetch(url, {
      ...options,
      method: 'POST',
      headers: isFormData 
        ? { ...options?.headers } // Don't set Content-Type for FormData (browser sets it with boundary)
        : {
            'Content-Type': 'application/json',
            ...options?.headers,
          },
      body: isFormData ? data : JSON.stringify(data),
    });
    return handleResponse<T>(response);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, 'Network error. Please check your connection.');
  }
}

export async function put<T>(url: string, data: unknown, options?: RequestInit): Promise<T> {
  try {
    const isFormData = data instanceof FormData;
    
    const response = await fetch(url, {
      ...options,
      method: 'PUT',
      headers: isFormData
        ? { ...options?.headers }
        : {
            'Content-Type': 'application/json',
            ...options?.headers,
          },
      body: isFormData ? data : JSON.stringify(data),
    });
    return handleResponse<T>(response);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, 'Network error. Please check your connection.');
  }
}

export async function del<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    return handleResponse<T>(response);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, 'Network error. Please check your connection.');
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return error.message || 'Bad request. Please check your input.';
      case 401:
        return 'Please log in to continue.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 422:
        return error.message || 'Invalid data provided.';
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred.';
}