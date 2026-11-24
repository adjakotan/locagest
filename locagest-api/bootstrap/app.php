<?php

use App\Http\Middleware\EnsureRole;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Sanctum en mode SPA : cookie de session sécurisé + protection CSRF (§8)
        $middleware->statefulApi();
        $middleware->alias(['role' => EnsureRole::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Contrat d'API : toujours du JSON sur /api, messages en français.
        $exceptions->shouldRenderJsonWhen(fn (Request $request) => $request->is('api/*') || $request->expectsJson());

        $exceptions->render(function (AccessDeniedHttpException $e, Request $request) {
            if ($request->is('api/*')) {
                $msg = $e->getMessage();

                return response()->json(['message' => ($msg && $msg !== 'This action is unauthorized.') ? $msg : 'Accès refusé.'], 403);
            }
        });
        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if ($request->is('api/*')) {
                $prev = $e->getPrevious();

                return response()->json(['message' => $prev instanceof ModelNotFoundException ? 'Ressource introuvable.' : ($e->getMessage() ?: 'Introuvable.')], 404);
            }
        });
    })->create();
