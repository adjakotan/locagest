@php
    $fmt = fn ($n) => number_format($n, 0, ',', ' ').' FCFA';
    $lease = $invoice->lease; $tenant = $lease->tenant; $unit = $lease->unit; $property = $unit->property; $owner = $property->owner;
    $periodLabel = ucfirst($invoice->period->locale('fr')->translatedFormat('F Y'));
@endphp
<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>{{ $payment->receipt_number }}</title>@include('pdf._style')</head>
<body>
<div class="header">
    <table><tr>
        <td><span class="brand">LocaGest</span><br><span class="muted">{{ $owner->company_name ?: $owner->name }}@if($owner->phone) · {{ $owner->phone }}@endif</span></td>
        <td class="right"><h1>Quittance de loyer</h1><strong>N° {{ $payment->receipt_number }}</strong></td>
    </tr></table>
</div>

<p>
    Je soussigné(e) <strong>{{ $owner->company_name ?: $owner->name }}</strong>, propriétaire du logement
    <strong>{{ $unit->label }} — {{ $property->name }}</strong> ({{ $property->address }}, {{ $property->city }}),
    déclare avoir reçu de <strong>{{ $tenant->full_name }}</strong> la somme de
    <strong>{{ $fmt($invoice->amount_paid) }}</strong> au titre de la facture {{ $invoice->invoice_number }}
    pour la période de <strong>{{ $periodLabel }}</strong>, et lui en donne quittance.
</p>

<table class="lines">
    <thead><tr><th>Détail de la facture</th><th class="right">Montant</th></tr></thead>
    <tbody>
    @foreach ($invoice->items as $item)
        <tr><td>{{ $item->label }}</td><td class="right">{{ $fmt($item->amount) }}</td></tr>
    @endforeach
    <tr class="total"><td>Total</td><td class="right">{{ $fmt($invoice->amount_due) }}</td></tr>
    </tbody>
</table>

<h3 style="margin-top:16px">Paiements reçus</h3>
<table class="lines">
    <thead><tr><th>Date</th><th>Moyen</th><th>Référence</th><th class="right">Montant</th></tr></thead>
    <tbody>
    @foreach ($invoice->payments as $p)
        <tr><td>{{ $p->paid_at->format('d/m/Y') }}</td><td>{{ $p->method->label() }}</td><td>{{ $p->reference ?: '—' }}</td><td class="right">{{ $fmt($p->amount) }}</td></tr>
    @endforeach
    </tbody>
</table>

<div class="stamp">PAYÉ — {{ $fmt($invoice->amount_paid) }}</div>
<p>Fait le {{ ($payment->confirmed_at ?? now())->format('d/m/Y') }}.</p>
<div class="footer">Quittance n° {{ $payment->receipt_number }}, numéro unique attribué par LocaGest. Montants en francs CFA (XOF).</div>
</body></html>
