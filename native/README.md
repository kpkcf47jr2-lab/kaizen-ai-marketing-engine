# Kame: motor propio de animación por escenas

Este módulo genera animación 3D mediante código propio y Blender. No descarga
pesos, no llama a HeyGen ni usa modelos externos. No es un modelo neuronal
fotorealista entrenado por Kame. Un prompt de actores, voz o una película realista
no debe presentarse como resuelto mediante estas primitivas.

`director.mjs` recibe un adaptador del Qwen existente, valida su JSON contra una
lista cerrada y devuelve el plan. No configura otro modelo, no contiene claves y
no comparte memorias. `render.mjs` convierte el plan en un MP4 real con Blender y
FFmpeg. El proceso no recibe credenciales, URLs ni código generado por el modelo.

## Alcance comprobable

- Esferas, cubos y cilindros; materiales RGB; transformaciones animadas y cámaras.
- Activos identificados y reutilizados entre planos para conservar apariencia.
- Hasta 8 planos, 30 segundos y un presupuesto agregado de trabajo por ejecución.
- MP4 H.264, FPS, dimensiones y número exacto de fotogramas comprobados con ffprobe.
- Render CPU exclusivamente. Sandbox Linux sin red, directorio personal ni
  dispositivos de GPU; la L4/Qwen no recibe nuevas dependencias ni reinicios.
- Cancelación, exclusión de ejecuciones simultáneas por instancia y timeout.
- Archivos temporales privados y limpieza al finalizar. No servidor público.

El despliegue deberá imponer además CPU, memoria, procesos y concurrencia global
mediante systemd/contenedor. El mutex JavaScript sólo limita una instancia.
En la prueba Linux: CPUQuota=50%, MemoryMax=768M, TasksMax=128, RuntimeMaxSec=360.

## Uso como biblioteca

```js
import { directScene } from './director.mjs';
import { createNativeRenderer } from './render.mjs';
// ownedChat es el adaptador de Qwen autenticado existente, no un proveedor nuevo.
const plan = await directScene(prompt, ownedChat);
const render = createNativeRenderer({ blenderPath, ffmpegPath, ffprobePath, bwrapPath });
const { bytes, metadata } = await render(plan, { signal });
```

El llamador debe conservar propietario, agente, autorización y clave idempotente
del trabajo en la cola privada existente. Este módulo NO debe exponerse como
una API anónima ni habilita cobros/publicación automáticamente.

## Pruebas

`node --test native/native.test.mjs` ejecuta validación y sandbox. El caso real
requiere KAME_NATIVE_TEST_BLENDER, KAME_NATIVE_TEST_BWRAP y FFmpeg/ffprobe en
/usr/bin. Sin esas variables el render real aparece OMITIDO, no aprobado.

## Películas y producción: pendiente

Faltan proyectos persistentes por capítulos, reanudación comprobada tras caída,
continuidad narrativa/visual, assets ricos autorizados, audio, montaje prolongado,
control de almacenamiento y pruebas de duración. No aumentar sin más este límite
para intentar renderizar una película de una sola vez. La integración con el chat
público y la cola autenticada aún no se ha desplegado.

## Reanudación acotada (26 noviembre, ampliación)

`checkpointRoot` habilita puntos de recuperación privados por plano. El llamador
pasa `checkpointKey` con el UUID del trabajo ya autenticado de la cola. Cada plano
se guarda atómicamente con SHA-256 y queda ligado al plan y al código exactos.
Una reanudación reutiliza sólo planos íntegros; otro trabajo o plan no los hereda.
El worker vivo mantiene un bloqueo exclusivo; un PID muerto se recupera. Un PID
reutilizado provoca un bloqueo conservador, nunca ejecución concurrente.

Máximo cuatro trabajos retenidos y 50 MiB por trabajo. El directorio debe ser
local, privado (0700) y del usuario del worker. No usar un filesystem compartido
entre máquinas. Si se llena, falla cerrado; revisar los trabajos terminales antes
de limpiar sus checkpoints. El éxito limpia sus propios checkpoints. No borra
resultados entregados ni aumenta el límite de render, las cuotas o los reintentos.

`continuousScene` comprueba posición y rotación de los activos recurrentes entre
planos del director; un salto no intencionado se rechaza. No certifica continuidad
narrativa, rostros, audio ni seguimiento general de cualquier descripción.
