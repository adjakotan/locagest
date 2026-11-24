<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CashController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\InvitationController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\LeaseController;
use App\Http\Controllers\Api\MaintenanceRequestController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PropertyController;
use App\Http\Controllers\Api\TenantController;
use App\Http\Controllers\Api\TenantSpaceController;
use App\Http\Controllers\Api\UnitController;
use Illuminate\Support\Facades\Route;

/*
| LocaGest — routes de l'API (cahier des charges §8.2). Sprints 1 et 2.
| Toutes les réponses sont en JSON ; voir docs/CONTRAT_API.md.
*/

// --- Public : authentification (F01, F02) et invitations (F04) ---
Route::middleware('throttle:10,1')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
    Route::get('/invitations/{token}', [InvitationController::class, 'show']);
    Route::post('/invitations/{token}/accept', [InvitationController::class, 'accept']);
});

Route::middleware('auth:sanctum')->group(function () {
    // --- Tous les rôles connectés ---
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::put('/user/profile', [AuthController::class, 'updateProfile']);
    Route::put('/user/password', [AuthController::class, 'updatePassword']);

    // Factures et quittances : propriétaire ou locataire titulaire (contrôle par les policies, R8)
    Route::get('/invoices/{invoice}/pdf', [InvoiceController::class, 'pdf']);
    Route::get('/payments/{payment}/receipt', [PaymentController::class, 'receipt']);
    Route::get('/payments/{payment}/proof', [PaymentController::class, 'proof']);

    // Signalements : locataire (F80) et propriétaire (F81, F83)
    Route::get('/maintenance-requests', [MaintenanceRequestController::class, 'index']);
    Route::post('/maintenance-requests', [MaintenanceRequestController::class, 'store']);
    Route::get('/maintenance-requests/{maintenanceRequest}', [MaintenanceRequestController::class, 'show']);
    Route::get('/maintenance-requests/{maintenanceRequest}/photo', [MaintenanceRequestController::class, 'photo']);

    // --- Espace propriétaire (F03 : réservé au rôle owner ; le rôle manager arrive au sprint 3) ---
    Route::middleware('role:owner')->group(function () {
        Route::get('/dashboard', DashboardController::class);

        Route::get('/properties/cities', [PropertyController::class, 'cities']);
        Route::apiResource('properties', PropertyController::class);
        Route::get('/properties/{property}/units', [UnitController::class, 'index']);
        Route::post('/properties/{property}/units', [UnitController::class, 'store']);
        Route::get('/units', [UnitController::class, 'search']);
        Route::get('/units/{unit}', [UnitController::class, 'show']);
        Route::put('/units/{unit}', [UnitController::class, 'update']);
        Route::delete('/units/{unit}', [UnitController::class, 'destroy']);

        Route::apiResource('tenants', TenantController::class)->except('destroy');
        Route::post('/tenants/{tenant}/invite', [TenantController::class, 'invite']);

        Route::get('/leases', [LeaseController::class, 'index']);
        Route::post('/leases', [LeaseController::class, 'store']);
        Route::get('/leases/{lease}', [LeaseController::class, 'show']);
        Route::post('/leases/{lease}/end', [LeaseController::class, 'end']);

        Route::get('/invoices', [InvoiceController::class, 'index']);
        Route::post('/invoices', [InvoiceController::class, 'store']);
        Route::post('/invoices/generate', [InvoiceController::class, 'generate']);
        Route::get('/invoices/{invoice}', [InvoiceController::class, 'show']);
        Route::post('/invoices/{invoice}/items', [InvoiceController::class, 'addItem']);
        Route::post('/invoices/{invoice}/payments', [PaymentController::class, 'store']);

        Route::get('/payments', [PaymentController::class, 'index']);
        Route::post('/payments/{payment}/confirm', [PaymentController::class, 'confirm']);
        Route::post('/payments/{payment}/reject', [PaymentController::class, 'reject']);
        Route::post('/payments/{payment}/cancel', [PaymentController::class, 'cancel']);

        Route::get('/properties/{property}/cash', [CashController::class, 'show']);
        Route::post('/properties/{property}/cash/withdrawals', [CashController::class, 'withdraw']);
        Route::post('/properties/{property}/cash/transfers', [CashController::class, 'transfer']);

        Route::get('/expense-categories', [ExpenseController::class, 'categories']);
        Route::post('/expense-categories', [ExpenseController::class, 'storeCategory']);
        Route::get('/expenses', [ExpenseController::class, 'index']);
        Route::post('/expenses', [ExpenseController::class, 'store']);
        Route::get('/expenses/{expense}', [ExpenseController::class, 'show']);
        Route::post('/expenses/{expense}/cancel', [ExpenseController::class, 'cancel']);
        Route::get('/expenses/{expense}/receipt', [ExpenseController::class, 'receipt']);

        Route::patch('/maintenance-requests/{maintenanceRequest}', [MaintenanceRequestController::class, 'update']);
    });

    // --- Espace locataire (F70–F73) ---
    Route::middleware('role:tenant')->prefix('me')->group(function () {
        Route::get('/leases', [TenantSpaceController::class, 'leases']);
        Route::get('/invoices', [TenantSpaceController::class, 'invoices']);
        Route::get('/invoices/{invoice}', [TenantSpaceController::class, 'invoice']);
        Route::post('/invoices/{invoice}/payments', [TenantSpaceController::class, 'declarePayment']);
        Route::get('/payments', [TenantSpaceController::class, 'payments']);
    });
});
