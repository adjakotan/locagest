<?php

use Illuminate\Support\Facades\Schedule;

// Traitements automatiques (cahier des charges §6)
Schedule::command('invoices:generate')->dailyAt('00:30')->withoutOverlapping();
Schedule::command('invoices:mark-late')->dailyAt('01:00')->withoutOverlapping();
