@php
    $fmt = fn ($n) => number_format($n, 0, ',', ' ').' FCFA';
    $lease = $invoice->lease; $tenant = $lease->tenant; $unit = $lease->unit; $property = $unit->property; $owner = $property->owner;
@endphp
<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>{{ $invoice->invoice_number }}</title>@include('pdf._style')</head>
<body>
<div class="header">
    <table><tr>
        <td><span class="brand">LocaGest</span><br><span class="muted">{{ $owner->company_name ?: $owner->name }}@if($owner->phone) · {{ $owner->phone }}@endif</span></td>
        <td class="right"><h1>Avis d'échéance</h1><strong>{{ $invoice->invoice_number }}</strong></td>
    </tr></table>
</div>

<table class="cols"><tr>
    <td style="padding-right:8px"><div class="box">
        <strong>Locataire</strong><br>{{ $tenant->full_name }}<br>{{ $tenant->phone }}
    </div></td>
    <td><div class="box">
        <strong>Logement</strong><br>{{ $unit->label }} — {{ $property->name }}<br>{{ $property->address }}, {{ $property->city }}
    </div></td>
</tr></table>

<p>
    Période : <strong>{{ ucfirst($invoice->period->locale('fr')->translatedFormat('F Y')) }}</strong> ·
    Émise le {{ $invoice->issued_at->format('d/m/Y') }} ·
    Échéance : <strong>{{ $invoice->due_date->format('d/m/Y') }}</strong>
</p>

<table class="lines">
    <thead><tr><th>Désignation</th><th>Type</th><th class="right">Montant</th></tr></thead>
    <tbody>
    @foreach ($invoice->items as $item)
        <tr><td>{{ $item->label }}</td><td>{{ $item->type->label() }}</td><td class="right">{{ $fmt($item->amount) }}</td></tr>
    @endforeach
    <tr class="total"><td colspan="2">Total à payer</td><td class="right">{{ $fmt($invoice->amount_due) }}</td></tr>
    @if ($invoice->amount_paid > 0)
        <tr><td colspan="2">Déjà payé</td><td class="right">{{ $fmt($invoice->amount_paid) }}</td></tr>
        <tr class="total"><td colspan="2">Reste à payer</td><td class="right">{{ $fmt($invoice->remaining()) }}</td></tr>
    @endif
    </tbody>
</table>

<p class="muted" style="margin-top:16px">
    Paiement en espèces, par Mobile Money ou par virement directement auprès du propriétaire.
    Indiquez le numéro {{ $invoice->invoice_number }} en référence.
</p>
<div class="footer">Document généré par LocaGest le {{ now()->format('d/m/Y à H:i') }}. Montants en francs CFA (XOF).</div>
</body></html>
