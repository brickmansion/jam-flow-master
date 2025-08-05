describe('Password Reset Flow', () => {
  beforeEach(() => {
    // Stub environment variable for consistent testing
    cy.window().then((win) => {
      win.process = { env: { NEXT_PUBLIC_APP_URL: 'http://localhost:3000' } };
    });
  });
  const testEmail = 'test@example.com';
  const newPassword = 'NewPassword123!';

  beforeEach(() => {
    cy.visit('/auth');
  });

  it('should complete full password reset flow', () => {
    // Step 1: Click forgot password link
    cy.get('button').contains('Forgot password?').click();
    
    // Step 2: Enter email in modal
    cy.get('[data-testid="forgot-password-modal"]').should('be.visible');
    cy.get('input[type="email"]').type(testEmail);
    cy.get('button').contains('Send Reset Link').click();
    
    // Step 3: Verify success message
    cy.contains('Check your email').should('be.visible');
    cy.contains(testEmail).should('be.visible');
    
    // Step 4: Simulate email link click by navigating directly
    // In a real test, you'd need to intercept the email or use a test email service
    const mockTokens = {
      access_token: 'test_access_token',
      refresh_token: 'test_refresh_token'
    };
    
    cy.visit(`/reset-password?access_token=${mockTokens.access_token}&refresh_token=${mockTokens.refresh_token}`);
    
    // Step 5: Fill in new password form
    cy.get('input[id="new-password"]').type(newPassword);
    cy.get('input[id="confirm-password"]').type(newPassword);
    
    // Step 6: Submit new password
    cy.get('button').contains('Update Password').click();
    
    // Step 7: Verify redirect to auth with success message
    cy.url().should('include', '/auth');
    cy.get('[data-sonner-toaster]').should('contain', 'Password updated');
  });

  it('should show error for invalid reset link', () => {
    // Visit reset page without valid tokens
    cy.visit('/reset-password');
    
    // Should show invalid link message
    cy.contains('Invalid Reset Link').should('be.visible');
    cy.contains('This password reset link is invalid or has expired').should('be.visible');
    
    // Should have button to go back to login
    cy.get('button').contains('Back to Login').click();
    cy.url().should('include', '/auth');
  });

  it('should validate password requirements', () => {
    const mockTokens = {
      access_token: 'test_access_token',
      refresh_token: 'test_refresh_token'
    };
    
    cy.visit(`/reset-password?access_token=${mockTokens.access_token}&refresh_token=${mockTokens.refresh_token}`);
    
    // Test weak password
    cy.get('input[id="new-password"]').type('weak');
    cy.get('input[id="confirm-password"]').type('weak');
    cy.get('button').contains('Update Password').click();
    
    // Should show validation error
    cy.get('[role="alert"]').should('contain', 'Password must be at least 6 characters');
  });

  it('should validate password confirmation match', () => {
    const mockTokens = {
      access_token: 'test_access_token',
      refresh_token: 'test_refresh_token'
    };
    
    cy.visit(`/reset-password?access_token=${mockTokens.access_token}&refresh_token=${mockTokens.refresh_token}`);
    
    // Test mismatched passwords
    cy.get('input[id="new-password"]').type(newPassword);
    cy.get('input[id="confirm-password"]').type('DifferentPassword123!');
    cy.get('button').contains('Update Password').click();
    
    // Should show mismatch error
    cy.get('[role="alert"]').should('contain', 'Passwords do not match');
  });

  it('should not allow authenticated users on reset page', () => {
    // This test would need to mock an authenticated user session
    // For a real implementation, you'd log in a user first
    cy.window().then((win) => {
      // Mock authenticated user
      win.localStorage.setItem('supabase.auth.token', 'mock_session');
    });
    
    cy.visit('/reset-password');
    
    // Should redirect to dashboard
    cy.url().should('include', '/dashboard');
  });
});