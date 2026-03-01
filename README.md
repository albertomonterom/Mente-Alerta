# Mente Alerta

Mente Alerta es una aplicación móvil desarrollada con React Native y Expo, diseñada para adultos mayores. La aplicación combina juegos sencillos con un sistema de detección de nombre por voz que genera alertas cuando el usuario es llamado mientras está entretenido.

El objetivo del proyecto es mejorar la atención y seguridad en entornos de espera como consultorios, bancos o centros de atención, donde una persona puede concentrarse en un juego y no escuchar cuando mencionan su nombre.

---

## Características

- Juegos simples y accesibles:
  - Sopa de Letras
  - Sudoku
  - Solitario
  - Dominó
- Modo Espera con temporizador
- Detección de nombre por voz (procesamiento local)
- Alertas visuales, sonoras y vibración
- Interfaz enfocada en accesibilidad y simplicidad
- Configuración almacenada localmente

---

## Tecnologías

- React Native
- Expo
- TypeScript
- Expo Router (file-based routing)
- AsyncStorage para persistencia local

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/mente-alerta.git
cd mente-alerta
```

### Instalar dependencias

```bash
npm install
```

### Iniciar la aplicación

```bash
npx expo start
```

Desde la consola podrás ejecutar la aplicación en:

- Expo Go (Android o iOS)
- Emulador de Android
- Simulador de iOS
- Development build

---

## Estructura del Proyecto

El proyecto utiliza file-based routing a través de Expo Router. El desarrollo principal se realiza dentro del directorio `app`.

```
mente-alerta/
│
├── app/              # Pantallas y rutas
├── assets/           # Recursos estáticos
├── components/       # Componentes reutilizables
├── hooks/            # Custom hooks
├── constants/        # Constantes globales
├── package.json
├── app.json
└── tsconfig.json
```

---

## Arquitectura

La aplicación está diseñada con un enfoque modular:

- Capa de interfaz: pantallas y componentes reutilizables.
- Capa de servicios: lógica de detección de voz y gestión de alertas.
- Persistencia local: almacenamiento del nombre y configuración del usuario.
- Escalable a backend en futuras versiones.

---

## Roadmap

- Optimización del módulo de detección de nombre.
- Integración opcional con backend para modo familiar.
- Notificaciones remotas para cuidadores.
- Métricas de uso y bienestar cognitivo.
- Mejora de accesibilidad y experiencia de usuario.

---

## Estado del Proyecto

En desarrollo activo (MVP).