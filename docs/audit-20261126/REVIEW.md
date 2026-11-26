# Auditoría Kame y preservación de Kaizen — 26 noviembre 2026

STATUS: **BLOCKED para producción completa; candidato técnico en evaluación**.

## Repositorio comprobado

Repositorio separado `kpkcf47jr2-lab/kaizen-ai-marketing-engine`, base
`493bb7c`, rama aislada `audit/kame-native-blender-20261126`. Se enumeraron
los 99 archivos versionados y se inspeccionaron interfaces, proveedores, procesadores y ramas
disponibles. La rama remota encontrada es main. No se encontró implementación
de inferencia propia, pesos de vídeo ni código Blender en esa base.

El proveedor real de vídeo era HeyGen; guion OpenAI y miniaturas DALL-E.
La ausencia de claves seleccionaba mocks con enlaces placeholder. Las notas
históricas que dicen “100% LIVE” no prueban generación, facturación o publicación.

## Cambios del candidato

1. Modo nativo por defecto: la generación heredada que depende de modelos
   externos falla explícitamente antes de invocarlos. Sólo una configuración
   administrativa deliberada puede reactivar esa ruta; no se habilitó.
2. Rechazo de proveedores mock antes de producir resultados facturables.
3. Verificación del propietario y trabajos terminales antes de escribir.
4. Publicación: verifica dueño, cuenta social, activo e identificadores; rechaza
   borradores, no usa MockPublisher, evita duplicar éxitos y conserva el estado
   ambiguo para conciliación. El claim usa comparación atómica del estado.
5. Se retiró una credencial de documentación y la impresión completa de REDIS_URL.
   **HIGH: revocar/rotar la credencial expuesta sigue pendiente**. Retirarla del
   archivo no la elimina del historial Git ni demuestra que ya no sea válida.
   No se utilizó la credencial ni se reescribió historia compartida.
6. Motor propio `native/`: director con Qwen inyectado, DSL cerrado de escenas,
   render Blender CPU, sandbox, límites, QA de vídeo y huellas del resultado/plan.

## Verificación

- Dependencias del lockfile instaladas sin scripts automáticos.
- Cliente Prisma generado localmente; ninguna migración ni conexión productiva.
- Worker TypeScript, paquete shared y Next.js build pasan. El build web emite
  avisos de Redis local no configurado y renderizado dinámico, no certificados
  de conectividad de producción. No se suministraron credenciales productivas.
- Pruebas de procesadores usan Prisma simulado y prohíben red: no son compras,
  publicaciones o cobros reales.
- El diagnóstico Qwen inicial no cargaba las variables de systemd y devolvió
  disabled. Eso no prueba una caída. Repetido con configuración explícita del
  túnel privado existente: Qwen produjo un plan válido en 11.152 ms a las
  22:08:17 UTC. Sin modelos externos, fondos o escrituras de memoria.
- Los primeros ensayos del render detectaron una importación faltante y la ruta
  distinta del sandbox instalado. Se corrigieron; no se omitió el sandbox.
- El ensayo inicial de 48 fotogramas agotó 360 s. Se activó reutilización de
  datos y redujo la fixture a 24 fotogramas, sin aumentar los límites del proceso.
  En el ensayo posterior, el plan REAL de Qwen produjo un MP4 correcto:
  320×240, 12 FPS, 24 fotogramas, 2 s, sin audio, render CPU en 272,842 s.
  SHA-256 `a5e18c04e914a71c0a77910e725773347a95c0d4166b9c1f438465192ad4ac0b`.
  Se inspeccionaron fotogramas inicial/final: esfera violeta en posiciones
  diferentes sobre fondo gris, coherente con el prompt de ensayo. No es un
  benchmark cinematográfico ni prueba de seguimiento de prompts arbitrarios.
- La suite que encadenaba ese render y la fixture agotó el límite global de
  360 s después de aprobar el caso Qwen; no se presenta como suite íntegra aprobada.
  La fixture se probó aparte con el mismo límite y recursos: 18 aprobadas, 1 omitida (el caso Qwen ya ejecutado por separado), cero fallos; duración 119,803 s.

## Autonomía de Kaizen, comprobación independiente

A las 22:05:14 UTC la wallet seleccionada `0x582784…db5222` sigue vinculada al
agente `kaizen_8167cc06ff6807b34f02c20917afe901a66f4e53`. Su delegación figura
`not-authorized`; Polygon y Base reportan cero USDC y gas; cero transferencias
sin resolver. No se afirma el saldo de otras redes. Ninguna firma o transferencia.

35/35 pruebas actuales de KairosCoin pasan: identidades, memoria separada,
reconciliación sin nueva firma, scheduler sujeto a revocación y proveedor propio.
Estos ensayos no sustituyen la delegación firmada real ni el funcionamiento
sostenido con el dispositivo cerrado. No se modificaron Qwen, su entorno, la
billetera, los permisos, memorias ni módulos concurrentes de Claude.

## Bloqueos antes de certificar

- Integrar director/render en la cola privada y el chat público conservando
  identidad, cuotas e idempotencia. El renderer aislado no prueba ese recorrido.
- El vídeo procedural no es síntesis fotorealista arbitraria ni una película.
- Revisar reserva/consumo transaccional de créditos y recuperación de trabajos
  heredados: el procesador original registra assets/posts antes de cobrar y no
  demuestra idempotencia completa. No habilitarlo para clientes con este parche.
- Rotar la credencial expuesta y comprobar dependencias antes de publicar el SaaS.
- Auditoría inicial del lockfile: 5 avisos críticos, 29 altos, 34 moderados y 5
  bajos. Son avisos de dependencias, no 73 exploits demostrados. Auth.js 4.24.15
  se incorpora en el candidato; `auth.ts` usa Credentials/Google y no el proveedor
  email/magic-link afectado por el aviso concreto. Se desactiva temporalmente
  la optimización de imágenes de Next 14, preservando originales. No resuelve
  todos los avisos de Next ni sustituye la migración y regresión de autenticación.
  Referencias: https://github.com/advisories/GHSA-7rqj-j65f-68wh y
  https://github.com/advisories/GHSA-2464-fhr4-w9xw.
- Delegación real, tareas desatendidas, herramientas con efectos autorizadas y
  observación sostenida siguen pendientes para certificar autonomía completa.

No se desplegó este candidato en producción ni se cambiaron límites financieros.
No copiar esta rama completa sobre KairosCoin: son repositorios distintos.

## Integración posterior en KairosCoin

El candidato de la rama `mall/production-qa-20261121` incorpora una copia
verificada por SHA-256 de los cinco archivos ejecutables de `native/`.
Añade herramientas MCP de crear desde texto, renderizar un plan y consultar el
resultado, con propietario derivado del contexto autenticado, idempotencia y
cuotas. El director usa el adaptador existente `ownedChatProvider` sin alterar
Qwen, su configuración o memoria. La disponibilidad se anuncia sólo por un worker.

La regresión integrada pasó 90/90 pruebas. Un ensayo Linux adicional generó
realmente un MP4 mediante la cola HTTP firmada y Blender, sin modelo externo:
1 s, 128×128, 12 FPS y 12 fotogramas. El servidor comprueba el contrato de salida.
El escenario usa identidad de prueba y escena declarativa; no es el chat público.
Se añadieron límites de disco (32 MiB de fuentes, 512 MiB de resultados y reserva
mínima de 2 GiB) sin borrar históricos. El render permanece en CPU limitada.

Estado de publicación: candidato guardado, NO desplegado ni certificado para
películas o autonomía completa. Evidencia de integración en KairosCoin:
`docs/mall-production-qa-20261121/kame-blender-20261126/`.
