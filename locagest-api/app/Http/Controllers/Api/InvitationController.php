<?php

namespace App\Http\Controllers\Api;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** F04 : acceptation de l'invitation d'un locataire (lien à usage unique, expirant). */
class InvitationController extends Controller
{
    private function findTenant(string $token): Tenant
    {
        $tenant = Tenant::where('invitation_token', hash('sha256', $token))->first();
        if (! $tenant || $tenant->user_id || ! $tenant->invitation_expires_at || $tenant->invitation_expires_at->isPast()) {
            abort(410, 'Ce lien d\'invitation est invalide, expiré ou déjà utilisé.');
        }

        return $tenant;
    }

    public function show(string $token): JsonResponse
    {
        $tenant = $this->findTenant($token);

        return response()->json([
            'full_name' => $tenant->full_name,
            'email' => $tenant->email,
            'owner' => $tenant->owner->company_name ?: $tenant->owner->name,
        ]);
    }

    public function accept(Request $request, string $token): JsonResponse
    {
        $tenant = $this->findTenant($token);
        $data = $request->validate(['password' => ['required', 'string', 'min:8', 'confirmed']]);

        if (User::where('email', $tenant->email)->exists()) {
            throw ValidationException::withMessages(['email' => 'Un compte existe déjà avec cet e-mail.']);
        }

        $user = DB::transaction(function () use ($tenant, $data) {
            $user = User::create([
                'name' => $tenant->full_name,
                'email' => $tenant->email,
                'phone' => $tenant->phone,
                'password' => $data['password'],
                'role' => Role::Tenant,
            ]);
            // Lien fiche ↔ compte ; le jeton est consommé (usage unique).
            DB::table('tenants')->where('id', $tenant->id)->update([
                'user_id' => $user->id,
                'invitation_token' => null,
                'invitation_expires_at' => null,
            ]);

            return $user;
        });

        Auth::guard('web')->login($user);
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        return (new UserResource($user))->response()->setStatusCode(201);
    }
}
