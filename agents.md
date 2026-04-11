# Solución de Errores Comunes en el Proyecto

## Error de Módulos Deno en Supabase Edge Functions

**Descripción del error:**
Al abrir los archivos `.ts` dentro de `supabase/functions/` (ej. `index.ts`), el editor (VSCode) marca múltiples errores en rojo en las importaciones y en el uso de la variable `Deno`.

**Códigos y mensajes comunes:**
- `TS2307: Cannot find module 'https://deno.land/...' or its corresponding type declarations.` (No se encuentra el módulo ni sus declaraciones de tipos correspondientes).
- `TS2584: Cannot find name 'Deno'.` (No se encuentra el nombre 'Deno').

**Causa:**
El proyecto principal (React/Vite) utiliza Node.js y el estándar clásico de TypeScript. Sin embargo, las funciones de Supabase (Edge Functions) utilizan el entorno **Deno**. El servidor de TypeScript de VSCode asume por defecto que todo el proyecto es Node.js, por lo tanto no reconoce las importaciones por URL (`https://`) ni los objetos globales nativos como `Deno`.

**Solución:**
Para solucionar este conflicto de entornos en un mismo proyecto (Node.js en el Frontend, Deno en Supabase), se debe configurar VSCode para que habilite la extensión de Deno **únicamente** en la carpeta de Supabase.

1. Instala la extensión oficial de Deno en VSCode (`denoland.vscode-deno`).
2. Crea o edita el archivo `.vscode/settings.json` en la raíz de tu proyecto e incluye la siguiente configuración:

```json
{
  "deno.enable": false,
  "deno.enablePaths": [
    "supabase/functions"
  ]
}
```

Esto le indicará a tu entorno de desarrollo que apague Deno globalmente (para no afectar a React) pero lo encienda exclusivamente para las funciones de Supabase, eliminando los falsos errores de sintaxis o de módulo no encontrado.
