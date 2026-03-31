describe('Authentication', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.visit('/login');
  });

  it('displays login page', () => {
    cy.contains('Welcome back').should('be.visible');
    cy.get('input[type="email"]').should('exist');
    cy.get('input[type="password"]').should('exist');
  });

  it('shows validation errors on empty submit', () => {
    cy.get('button[type="submit"]').click();
    cy.contains('Email is required').should('be.visible');
  });

  it('shows error for invalid email', () => {
    cy.get('input[type="email"]').type('notanemail');
    cy.get('button[type="submit"]').click();
    cy.contains('Invalid email').should('be.visible');
  });

  it('navigates to register page', () => {
    cy.contains('Sign up').click();
    cy.url().should('include', '/register');
    cy.contains('Create your account').should('be.visible');
  });

  it('navigates to forgot password', () => {
    cy.contains('Forgot your password?').click();
    cy.url().should('include', '/forgot-password');
  });

  it('redirects to dashboard when already logged in', () => {
    localStorage.setItem('accessToken', 'fake-token');
    localStorage.setItem('user', JSON.stringify({ id: '1', firstName: 'Test', role: 'admin' }));
    cy.visit('/login');
    cy.url().should('include', '/dashboard');
  });
});

describe('Dashboard', () => {
  it('redirects to login when not authenticated', () => {
    cy.clearLocalStorage();
    cy.visit('/dashboard');
    cy.url().should('include', '/login');
  });
});
