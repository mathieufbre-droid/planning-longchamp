import BoutonDeconnexion from "@/components/BoutonDeconnexion";

export default function EnAttente() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-sm bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-3 text-sm">
        <h1 className="font-bold text-base">Compte en attente d&apos;activation</h1>
        <p className="text-gray-600">Votre compte existe mais n&apos;a pas encore été activé. Demandez à un administrateur de la famille de l&apos;activer.</p>
        <BoutonDeconnexion />
      </div>
    </main>
  );
}
