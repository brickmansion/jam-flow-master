describe('Password Reset Flow', () => {
  beforeEach(() => {
    // Stub the Supabase auth methods
    cy.window().then((win) => {
      // Mock successful token exchange
      cy.stub(win.supabase.auth, 'exchangeCodeForSession').resolves({
        data: { session: { user: { id: 'test-user' } } },
        error: null
      });

      // Mock successful password update
      cy.stub(win.supabase.auth, 'updateUser').resolves({
        data: { user: { id: 'test-user' } },
        error: null
      });
    });
  });

  it('should reset password successfully', () => {
    // Visit reset password page with valid token
    cy.visit('/reset-password?type=recovery&access_token=TEST');

    // Wait for token exchange and form to appear
    cy.get('#password', { timeout: 10000 }).should('be.visible');

    // Fill in new password
    cy.get('#password').type('NewPassword123');
    cy.get('#confirmPassword').type('NewPassword123');

    // Submit form
    cy.get('button[type="submit"]').click();

    // Assert redirect to login with success parameter
    cy.url().should('include', '/auth?reset=success');
  });

  it('should show error for invalid token', () => {
    // Mock failed token exchange
    cy.window().then((win) => {
      cy.stub(win.supabase.auth, 'exchangeCodeForSession').resolves({
        data: { session: null },
        error: { message: 'Invalid token' }
      });
    });

    // Visit reset password page with invalid token
    cy.visit('/reset-password?type=recovery&access_token=INVALID');

    // Should show invalid token message
    cy.contains('Invalid or expired link').should('be.visible');
    cy.contains('Back to login').should('be.visible');
  });

  it('should show error for missing token', () => {
    // Visit reset password page without token
    cy.visit('/reset-password');

    // Should show invalid token message
    cy.contains('Invalid or expired link').should('be.visible');
  });

  it('should validate password requirements', () => {
    // Visit with valid token
    cy.visit('/reset-password?type=recovery&access_token=TEST');

    // Wait for form
    cy.get('#password', { timeout: 10000 }).should('be.visible');

    // Try with short password
    cy.get('#password').type('123');
    cy.get('#confirmPassword').type('123');
    cy.get('button[type="submit"]').click();

    // Should show error
    cy.contains('Password must be at least 8 characters').should('be.visible');
  });

  it('should validate password match', () => {
    // Visit with valid token
    cy.visit('/reset-password?type=recovery&access_token=TEST');

    // Wait for form
    cy.get('#password', { timeout: 10000 }).should('be.visible');

    // Try with mismatched passwords
    cy.get('#password').type('Password123');
    cy.get('#confirmPassword').type('DifferentPassword123');
    cy.get('button[type="submit"]').click();

    // Should show error
    cy.contains('Passwords do not match').should('be.visible');
  });
});