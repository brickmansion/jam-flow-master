// Input validation utilities for security

export function sanitizeHtml(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove basic HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

export function sanitizeTaskDescription(description: string): string {
  if (!description) return '';
  
  // Remove potential XSS vectors while preserving basic formatting
  return description
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '') // Remove iframe tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data: URLs
    .trim()
    .slice(0, 1000); // Limit length
}

export function validateProjectName(name: string): { isValid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'Project name is required' };
  }
  
  if (name.length > 100) {
    return { isValid: false, error: 'Project name must be less than 100 characters' };
  }
  
  // Check for potentially dangerous characters
  if (/<|>|javascript:|data:|on\w+=/i.test(name)) {
    return { isValid: false, error: 'Project name contains invalid characters' };
  }
  
  return { isValid: true };
}

export function validateTaskTitle(title: string): { isValid: boolean; error?: string } {
  if (!title || title.trim().length === 0) {
    return { isValid: false, error: 'Task title is required' };
  }
  
  if (title.length > 200) {
    return { isValid: false, error: 'Task title must be less than 200 characters' };
  }
  
  // Check for potentially dangerous characters
  if (/<|>|javascript:|data:|on\w+=/i.test(title)) {
    return { isValid: false, error: 'Task title contains invalid characters' };
  }
  
  return { isValid: true };
}

export function validateUrl(url: string): { isValid: boolean; error?: string } {
  if (!url) {
    return { isValid: true }; // Empty URL is allowed
  }
  
  try {
    const parsedUrl = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { isValid: false, error: 'Only HTTP and HTTPS URLs are allowed' };
    }
    
    // Block localhost and private IPs in production
    const hostname = parsedUrl.hostname.toLowerCase();
    if (hostname === 'localhost' || 
        hostname === '127.0.0.1' || 
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.')) {
      return { isValid: false, error: 'Private network URLs are not allowed' };
    }
    
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
}

export function validateFileDescription(description: string): { isValid: boolean; error?: string } {
  if (!description) {
    return { isValid: true }; // Empty description is allowed
  }
  
  if (description.length > 500) {
    return { isValid: false, error: 'File description must be less than 500 characters' };
  }
  
  // Check for potentially dangerous characters
  if (/<script|<iframe|javascript:|data:|on\w+=/i.test(description)) {
    return { isValid: false, error: 'File description contains invalid content' };
  }
  
  return { isValid: true };
}

export function validateEmail(email: string): { isValid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email || email.trim().length === 0) {
    return { isValid: false, error: 'Email is required' };
  }
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }
  
  if (email.length > 254) {
    return { isValid: false, error: 'Email address is too long' };
  }
  
  return { isValid: true };
}