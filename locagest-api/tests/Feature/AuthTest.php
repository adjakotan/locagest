<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\Hash;

/** US 1.2, 1.3, 1.4 — F01–F05 */
class AuthTest extends LocaGestTestCase
{
    public function test_owner_can_register_as_company(): void
    {
        $res = $this->postJson('/api/register', [
            'name' => 'Awa Bio', 'email' => 'awa@example.com', 'phone' => '+22990000000',
            'password' => 'secret123', 'password_confirmation' => 'secret123',
            'account_type' => 'company', 'company_name' => 'Bio Immo SARL', 'company_ifu' => '3201900000000',
        ]);

        $res->assertCreated()->assertJsonPath('data.role', 'owner')->assertJsonPath('data.company_name', 'Bio Immo SARL');
        $user = User::where('email', 'awa@example.com')->first();
        $this->assertNotEquals('secret123', $user->password);
        $this->assertTrue(Hash::check('secret123', $user->password));
    }

    public function test_registration_validates_input(): void
    {
        $this->owner(['email' => 'pris@example.com']);
        $this->postJson('/api/register', [
            'name' => 'X', 'email' => 'pris@example.com', 'phone' => '1',
            'password' => 'court', 'password_confirmation' => 'autre', 'account_type' => 'company',
        ])->assertUnprocessable()->assertJsonValidationErrors(['email', 'password', 'company_name']);
    }

    public function test_login_with_wrong_credentials_gives_neutral_message(): void
    {
        $this->owner(['email' => 'a@example.com']);
        $this->postJson('/api/login', ['email' => 'a@example.com', 'password' => 'mauvais'])
            ->assertUnprocessable()->assertJsonPath('errors.email.0', 'Identifiants incorrects.');
    }

    public function test_guest_cannot_access_protected_routes(): void
    {
        $this->getJson('/api/user')->assertUnauthorized();
        $this->getJson('/api/properties')->assertUnauthorized();
    }

    public function test_tenant_cannot_call_owner_api(): void
    {
        $tenantUser = User::factory()->create(['role' => 'tenant']);
        $this->actingAs($tenantUser)->getJson('/api/properties')->assertForbidden();
        $this->actingAs($tenantUser)->getJson('/api/dashboard')->assertForbidden();
    }

    public function test_owner_cannot_call_tenant_api(): void
    {
        $this->actingAs($this->owner())->getJson('/api/me/invoices')->assertForbidden();
    }

    public function test_profile_and_password_update(): void
    {
        $owner = $this->owner(['password' => 'ancien123']);
        $this->actingAs($owner)->putJson('/api/user/profile', ['name' => 'Nouveau nom', 'email' => $owner->email, 'phone' => '0102'])
            ->assertOk()->assertJsonPath('data.name', 'Nouveau nom');
        $this->actingAs($owner)->putJson('/api/user/password', ['current_password' => 'faux', 'password' => 'nouveau123', 'password_confirmation' => 'nouveau123'])
            ->assertUnprocessable();
        $this->actingAs($owner)->putJson('/api/user/password', ['current_password' => 'ancien123', 'password' => 'nouveau123', 'password_confirmation' => 'nouveau123'])
            ->assertOk();
    }
}
