<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Schéma LocaGest — Sprints 1 et 2 (cahier des charges §5.2).
 * Les tables property_managers et budgets arrivent au sprint 3 (lots 8 et 9).
 */
return new class extends Migration
{
    public function up(): void
    {
        // Compteurs pour les numéros séquentiels (factures F-..., quittances Q-...) — RG08, F51
        Schema::create('sequences', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->unsignedBigInteger('value')->default(0);
        });

        Schema::create('properties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->string('address');
            $table->string('city');
            $table->string('neighborhood')->nullable();
            $table->text('description')->nullable();
            $table->unsignedTinyInteger('reserve_rate')->default(10); // RG18
            $table->timestamps();
            $table->index(['owner_id', 'city']);
        });

        Schema::create('units', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->constrained()->cascadeOnDelete();
            $table->string('label');
            $table->enum('type', ['room', 'apartment', 'house', 'shop']);
            $table->unsignedInteger('default_rent');
            $table->enum('status', ['vacant', 'occupied'])->default('vacant');
            $table->timestamps();
            $table->index(['property_id', 'status']);
        });

        Schema::create('tenants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('full_name');
            $table->string('phone');
            $table->string('email')->nullable();
            $table->string('id_number')->nullable();
            $table->string('emergency_contact')->nullable();
            // Invitation (F04) : jeton haché, expiration, usage unique
            $table->string('invitation_token')->nullable()->unique();
            $table->timestamp('invitation_expires_at')->nullable();
            $table->timestamps();
            $table->index(['owner_id', 'full_name']);
            $table->index(['owner_id', 'phone']);
        });

        Schema::create('leases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('unit_id')->constrained()->restrictOnDelete();
            $table->foreignId('tenant_id')->constrained()->restrictOnDelete();
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->unsignedInteger('rent_amount');      // copie figée (RG03)
            $table->unsignedInteger('deposit_amount')->default(0);
            $table->unsignedTinyInteger('due_day');      // 1–28 (RG04)
            $table->unsignedInteger('late_fee')->default(0); // pénalité de retard prévue au bail (§6)
            $table->enum('status', ['active', 'ended'])->default('active');
            $table->unsignedInteger('deposit_returned')->nullable();
            $table->text('deposit_deductions_note')->nullable();
            $table->timestamps();
            $table->index(['unit_id', 'status']);
        });

        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lease_id')->constrained()->restrictOnDelete();
            $table->string('invoice_number')->unique();
            $table->date('period');      // toujours le 1er du mois
            $table->date('issued_at');
            $table->date('due_date');
            $table->unsignedInteger('amount_due')->default(0);
            $table->unsignedInteger('amount_paid')->default(0);
            $table->enum('status', ['pending', 'partial', 'paid', 'late'])->default('pending');
            $table->timestamps();
            $table->unique(['lease_id', 'period']); // RG05
            $table->index(['period', 'status']);
        });

        Schema::create('maintenance_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->constrained()->cascadeOnDelete();
            $table->foreignId('unit_id')->nullable()->constrained()->nullOnDelete(); // null = parties communes
            $table->foreignId('tenant_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->text('description');
            $table->string('photo_path')->nullable();
            $table->enum('priority', ['low', 'normal', 'urgent'])->default('normal');
            $table->enum('status', ['open', 'in_progress', 'resolved'])->default('open');
            $table->foreignId('reported_by')->constrained('users');
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
            $table->index(['property_id', 'status']);
        });

        Schema::create('expense_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->timestamps();
        });

        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->constrained()->restrictOnDelete(); // RG13
            $table->foreignId('unit_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('maintenance_request_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('category_id')->constrained('expense_categories');
            $table->unsignedInteger('amount');
            $table->date('spent_at');
            $table->enum('method', ['cash', 'mobile_money', 'transfer']);
            $table->string('supplier')->nullable();
            $table->text('description')->nullable();
            $table->string('receipt_path')->nullable();
            $table->enum('funded_from', ['main', 'reserve'])->default('main');
            $table->enum('rebill_mode', ['none', 'equal', 'by_rent', 'single'])->default('none');
            $table->foreignId('rebill_lease_id')->nullable()->constrained('leases')->nullOnDelete();
            $table->enum('status', ['pending', 'approved', 'rejected', 'cancelled'])->default('approved');
            $table->foreignId('recorded_by')->constrained('users');
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->timestamp('approved_at')->nullable();
            $table->string('cancel_reason')->nullable();
            $table->timestamps();
            $table->index(['property_id', 'status', 'spent_at']);
        });

        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['rent', 'water', 'electricity', 'waste', 'shared_charge', 'penalty', 'damage', 'correction', 'other']);
            $table->string('label');
            $table->integer('amount'); // négatif autorisé pour une correction (RG25)
            $table->foreignId('expense_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('amount');
            $table->date('paid_at');
            $table->enum('method', ['cash', 'mobile_money', 'transfer']);
            $table->string('reference')->nullable();
            $table->string('proof_path')->nullable();
            $table->enum('status', ['declared', 'confirmed', 'rejected', 'cancelled']);
            $table->boolean('declared_by_tenant')->default(false);
            $table->foreignId('confirmed_by')->nullable()->constrained('users');
            $table->timestamp('confirmed_at')->nullable();
            $table->string('receipt_number')->nullable()->unique(); // RG08
            $table->foreignId('recorded_by')->constrained('users');
            $table->text('note')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('cancel_reason')->nullable();
            $table->timestamps();
            $table->index(['invoice_id', 'status']);
        });

        Schema::create('fund_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->constrained()->restrictOnDelete();
            $table->enum('fund', ['main', 'reserve']);
            $table->enum('direction', ['in', 'out']);
            $table->unsignedInteger('amount');
            $table->enum('type', ['rent_payment', 'expense', 'owner_withdrawal', 'transfer', 'deposit_retention', 'reversal']);
            $table->foreignId('payment_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('expense_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('recorded_by')->constrained('users');
            $table->date('moved_at');
            $table->string('note')->nullable();
            $table->timestamps();
            $table->index(['property_id', 'fund']);
        });
    }

    public function down(): void
    {
        foreach (['fund_movements', 'payments', 'invoice_items', 'expenses', 'expense_categories',
            'maintenance_requests', 'invoices', 'leases', 'tenants', 'units', 'properties', 'sequences'] as $t) {
            Schema::dropIfExists($t);
        }
    }
};
