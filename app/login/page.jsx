import FormularioLogin from "@/modules/auth/components/FormularioLogin";

export const metadata = {
  title: "Iniciar sesión · Sistema Cronogramas",
};

// Pantalla de ingreso: fondo limpio y la tarjeta centrada (el logo de la empresa irá sobre los campos).
export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-2rem)] items-center justify-center md:min-h-[calc(100vh-3rem)]">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-[0_10px_40px_-12px_rgba(29,29,27,0.18)] ring-1 ring-slate-200">
        <div className="h-1.5 bg-marca" aria-hidden="true" />
        <div className="px-7 pb-8 pt-7">
          <div className="mb-6 text-center">
            <h2 className="text-lg font-bold text-slate-900">Iniciar sesión</h2>
            <p className="text-sm text-slate-500">Ingrese con el usuario y la contraseña que le asignó el administrador.</p>
          </div>
          <FormularioLogin />
        </div>
      </div>
    </div>
  );
}
