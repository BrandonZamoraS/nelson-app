# 00 - Contexto General

## Producto
Panel administrativo para gestionar usuarios y suscripciones de una plataforma externa de chatbot.

## Objetivo v1
Entregar un MVP funcional con operación diaria completa sobre:

- Autenticación de administrador.
- Gestión de usuarios.
- Gestión manual de suscripciones.
- Cambio de estado de suscripciones.
- Auditoría de acciones.
- Configuración operativa.

## Decisiones de alcance ya acordadas

- Backend de datos y auth: **Supabase**.
- Integraciones activas desde el panel (Hotmart/chatbot): **fuera de MVP**.
- Hotmart puede escribir directamente en base de datos por fuera de la app.
- Debe existir creación manual de suscripciones.
- Modelo v1: **1 usuario = 1 suscripción**.
- Estados oficiales de suscripción:
  - `activa`
  - `gracia`
  - `suspendida`
  - `terminada`
- Vistas objetivo: todas las pantallas presentes en `design.pen`.

## Pantallas objetivo (design.pen)

- Login
- Inicio (Dashboard)
- Usuarios
- Suscripciones
- Auditoría
- Configuración
- Modales: Crear usuario, Ver usuario, Editar usuario

## Entidades de dominio v1

- Usuario
  - nombre completo
  - WhatsApp (único)
- Suscripción
  - plan
  - estado
  - fechas clave (inicio, próximo cobro)
  - origen (`manual` por defecto)
- Auditoría
  - actor
  - entidad
  - acción
  - detalle
  - resultado
- Configuración global
  - días de gracia
  - plantillas de mensajes
  - moneda
  - zona horaria
  - formato de fecha

## Reglas de negocio mínimas

- No puede existir más de un usuario con el mismo WhatsApp.
- Cada usuario tiene exactamente una suscripción.
- Transiciones de estado válidas (v1):
  - `activa -> gracia | suspendida | terminada`
  - `gracia -> activa | suspendida | terminada`
  - `suspendida -> activa | terminada`
  - `terminada ->` sin transición
- Toda acción de mutación debe generar evento de auditoría.

## Defaults operativos

- Moneda: `ARS`
- Zona horaria: `America/Argentina/Buenos_Aires`
- Formato fecha: `DD/MM/YYYY`
- Días de gracia: `3`

## Fuera de alcance (v1)

- Multi-tenant.
- Roles y permisos avanzados.
- Integración activa con APIs externas.
- Facturación automatizada.
