# Budget App

Una aplicación de gestión financiera construida con React, Vite y Supabase.

## Características

- Autenticación de usuarios con Supabase Auth
- Gestión de cuentas financieras compartidas
- Billeteras para organizar fondos
- Registro de transacciones
- Sistema de presupuestos
- Asignación de fondos a presupuestos
- Interfaz responsiva y fácil de usar

## Tecnologías

- **Frontend:** React 18, Vite
- **Backend:** Supabase (PostgreSQL)
- **Autenticación:** Supabase Auth
- **Estilos:** CSS-in-JS (inline styles)

## Configuración

### 1. Clona el repositorio

```bash
git clone <url-del-repo>
cd budget-app
```

### 2. Instala dependencias

```bash
npm install
```

### 3. Configura Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ejecuta el esquema SQL proporcionado en `schemabackend.md` en el SQL Editor de Supabase
3. Copia la URL del proyecto y la clave anónima
4. Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

### 4. Ejecuta la aplicación

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5174`

## Estructura del Proyecto

```
src/
├── components/
│   ├── Auth/
│   │   ├── Login.jsx
│   │   └── Signup.jsx
│   ├── Accounts.jsx
│   ├── Allocations.jsx
│   ├── Budgets.jsx
│   ├── Dashboard.jsx
│   ├── Transactions.jsx
│   └── Wallets.jsx
├── contexts/
│   └── AuthContext.jsx
├── hooks/
│   ├── useAccounts.js
│   ├── useAllocations.js
│   ├── useBudgets.js
│   ├── useTransactions.js
│   └── useWallets.js
├── services/
│   ├── accountsService.js
│   ├── accountMembersService.js
│   ├── allocationsService.js
│   ├── budgetsService.js
│   ├── index.js
│   ├── profilesService.js
│   ├── transactionsService.js
│   └── walletsService.js
├── supabaseClient.js
├── App.jsx
└── main.jsx
```

## Arquitectura

La aplicación sigue una arquitectura limpia con separación de responsabilidades:

- **Servicios:** Manejan la comunicación con Supabase
- **Hooks:** Gestionan el estado y la lógica de negocio
- **Contextos:** Proveen estado global (autenticación)
- **Componentes:** UI declarativa y reutilizable

## Funcionalidades

### Autenticación
- Registro de nuevos usuarios
- Inicio de sesión
- Cierre de sesión

### Cuentas
- Crear cuentas financieras
- Gestionar miembros de cuentas
- Ver cuentas del usuario

### Billeteras
- Crear billeteras dentro de cuentas
- Gestionar balances
- Transferencias entre billeteras

### Transacciones
- Registrar movimientos financieros
- Ver historial de transacciones
- Tipos: transferencias, ingresos, gastos

### Presupuestos
- Definir categorías con objetivos
- Seguimiento de progreso

### Asignaciones
- Asignar fondos de billeteras a presupuestos
- Gestionar distribuciones

## UI Framework

La aplicación utiliza **shadcn/ui** con el preset **new-york** para componentes de UI consistentes y accesibles. Basado en Tailwind CSS y Radix UI.

### Componentes Disponibles

- `Button`: Botones con variantes (default, destructive, outline, etc.)
- `Input`: Campos de entrada estilizados
- `Card`: Contenedores con header, content, footer

### Configuración

- **Tailwind CSS**: Configurado en `tailwind.config.js`
- **CSS Variables**: Variables CSS para temas en `src/index.css`
- **Utilidades**: Función `cn` en `src/lib/utils.js` para combinar clases

Para agregar más componentes shadcn, usa:

```bash
npx shadcn-ui@latest add [component-name]
```

## Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT.