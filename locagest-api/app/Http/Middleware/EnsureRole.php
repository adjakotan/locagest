<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** F03 / US 1.4 : réserve une route à un ou plusieurs rôles. Usage : ->middleware('role:owner,manager') */
class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();
        if (! $user || ! in_array($user->role->value, $roles, true)) {
            abort(403, 'Accès réservé : votre rôle ne permet pas cette action.');
        }

        return $next($request);
    }
}
