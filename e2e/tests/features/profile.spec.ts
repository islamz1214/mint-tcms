import { test, expect } from '@playwright/test';
import { AuthPage, createTestUser } from '../page-objects/auth-page';
import { authenticateViaApi } from '../helpers/auth';
import { Navbar } from '../page-objects/navbar';
import { ProfilePage } from '../page-objects/profile-page';

test.describe('Profile', () => {
  let email: string;

  test.beforeEach(async ({ page }) => {
    const user = createTestUser('profile', 'Profile Tester', 'Profile123!');

    email = user.email;
    await authenticateViaApi(page, user);
  });

  test('can update profile details', async ({ page }) => {
    const navbar = new Navbar(page);
    const profilePage = new ProfilePage(page);

    await profilePage.goto();
    await profilePage.updateProfile('Profile Tester Updated');
    await profilePage.expectProfileUpdated();
    await navbar.gotoDashboard();

    await expect(page.getByRole('heading', { name: /welcome back, profile tester updated/i })).toBeVisible();
  });

  test('can change password and sign in with the new password', async ({ page }) => {
    const authPage = new AuthPage(page);
    const navbar = new Navbar(page);
    const profilePage = new ProfilePage(page);

    await profilePage.goto();
    await profilePage.updatePassword('NewProfile123!');
    await profilePage.expectPasswordUpdated();
    await navbar.signOut();
    await authPage.loginAndExpectDashboard(email, 'NewProfile123!');
  });
});