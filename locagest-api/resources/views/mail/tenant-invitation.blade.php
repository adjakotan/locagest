<x-mail::message>
# Bonjour {{ $name }},

**{{ $owner }}** vous invite à créer votre espace locataire sur LocaGest.

Vous pourrez y consulter vos factures, télécharger vos quittances, déclarer vos paiements et signaler une panne dans votre logement.

<x-mail::button :url="$url">
Créer mon compte
</x-mail::button>

Ce lien est valable 7 jours et ne peut être utilisé qu'une seule fois.

Cordialement,<br>
L'équipe LocaGest
</x-mail::message>
