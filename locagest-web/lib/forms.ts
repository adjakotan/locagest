import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError } from "./api";

/** Affiche les erreurs 422 de Laravel sous les champs concernés ; renvoie le message général. */
export function applyServerErrors<T extends FieldValues>(e: unknown, setError: UseFormSetError<T>): string {
  if (e instanceof ApiError) {
    Object.entries(e.errors).forEach(([field, msgs]) => setError(field as Path<T>, { type: "server", message: msgs[0] }));
    return Object.keys(e.errors).length ? "" : e.message;
  }
  return "Impossible de joindre le serveur. Vérifiez votre connexion.";
}

/** Message d'erreur lisible pour une action simple. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const first = Object.values(e.errors)[0]?.[0];
    return first ?? e.message;
  }
  return "Impossible de joindre le serveur.";
}
