# Requerimientos funcionales - Huellitas a casa

**Versión:** 1.1
**Contexto:** Plataforma de emergencia para reportar, buscar y reencontrar mascotas perdidas, con contacto directo vía WhatsApp.

---

## Actores del sistema

| Actor                  | Descripción                                                                                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Visitante**          | Persona sin cuenta que puede navegar, buscar, filtrar y consultar reportes, estadísticas y contactar mediante WhatsApp.       |
| **Usuario registrado** | Persona autenticada mediante Google que puede crear y administrar sus propios reportes, editarlos y marcarlos como resueltos. |
| **Administrador**      | Puede moderar contenido: ocultar, eliminar o revisar reportes reportados por abuso.                                           |

---

## RF-01: Registro y autenticación de usuario

**Prioridad:** Alta

**Descripción:** El sistema debe permitir a los usuarios crear una cuenta e iniciar sesión mediante un proveedor de identidad externo, inicialmente **Google OAuth 2.0**. El sistema debe asociar la cuenta de Google con un usuario interno de Huellitas a Casa.

**Flujo principal: Google OAuth:**

1. El usuario accede a "Crear cuenta" o "Iniciar sesión".
2. Selecciona **"Continuar con Google"**.
3. El sistema redirige al usuario al proceso de autenticación de Google.
4. El usuario autoriza a Huellitas a Casa a obtene r la información básica de su cuenta.
5. Google devuelve la información de autenticación al sistema.
6. El sistema verifica la identidad y crea la cuenta si no existe.
7. Si la cuenta ya existe, el sistema inicia sesión.
8. El usuario es redirigido a la aplicación.

**Información obtenida de Google:**

* Identificador único de Google.
* Nombre.
* Correo electrónico.
* Fotografía de perfil (opcional).

**Reglas:**

* Google OAuth será el método de autenticación principal del MVP.
* El sistema no debe almacenar la contraseña de Google del usuario.
* No es obligatorio registrarse para crear un reporte (ver RF-02/RF-03).
* El registro sí es necesario para:

  * administrar reportes propios;
  * marcar un reporte propio como resuelto;
  * recibir sugerencias de coincidencias;
  * consultar y administrar los reportes creados por el usuario.
* Un usuario solo puede tener una cuenta asociada a un mismo identificador de Google.
* El sistema debe utilizar el identificador proporcionado por Google para asociar la cuenta, no únicamente el nombre o correo electrónico.
* El sistema debe solicitar únicamente los permisos de Google necesarios para la autenticación.

**Criterios de aceptación:**

* El usuario puede crear una cuenta utilizando Google sin establecer una contraseña adicional.
* Un usuario que ya tenga una cuenta puede iniciar sesión utilizando Google.
* No se crean cuentas duplicadas cuando un usuario inicia sesión nuevamente con la misma cuenta de Google.
* El sistema almacena de forma segura las credenciales/tokens necesarios para mantener la sesión.
* El sistema nunca almacena la contraseña de Google.
* Si la autenticación con Google falla o es cancelada, el usuario recibe un mensaje apropiado y puede volver a intentarlo.
* El usuario puede cerrar sesión.
* El usuario puede acceder posteriormente a sus reportes después de autenticarse.

---

## RF-02: Crear reporte de mascota perdida (LOST)

**Prioridad:** Crítica
**Descripción:** Cualquier usuario autenticado puede publicar que perdió una mascota.

**Datos requeridos:**
| Campo | Obligatorio | Notas |
|---|---|---|
| Tipo de reporte (`LOST`) | Sí | Fijo según flujo elegido |
| Nombre de la mascota | No | Puede omitirse |
| Especie | Sí | Perro, gato, otro |
| Raza | No | |
| Sexo | No | Macho/Hembra/No sé |
| Color | Sí | |
| Tamaño | Sí | Pequeño/Mediano/Grande |
| Descripción libre | No | Máx. ~300 caracteres |
| Fotografía(s) | Sí (mín. 1) | Máx. sugerido: 3 |
| Última ubicación vista | Sí | GPS o selección en mapa |
| Fecha/hora última vez vista | Sí | |
| WhatsApp de contacto | Sí | Obligatorio para publicar |
| Aceptación de términos de contacto | Sí | Checkbox |

**Flujo principal:**
1. El usuario selecciona "Perdí mi mascota".
2. Completa el formulario en pasos (especie → foto → características → ubicación → contacto).
3. El sistema valida campos obligatorios.
4. Se crea el registro con `type=LOST`, `status=ACTIVE`.
5. Se publica y aparece en el feed/búsqueda inmediatamente.

**Criterios de aceptación:**
- El formulario completo debe poder llenarse en menos de 1 minuto en móvil (ver RNF-11).
- El reporte queda visible públicamente de inmediato (sin aprobación previa), salvo que dispare reglas anti-spam (ver RF-16 no funcional).

---

## RF-03: Crear reporte de mascota encontrada (FOUND)

**Prioridad:** Crítica
**Descripción:** Cualquier usuario autenticado puede publicar que perdió una mascota.

**Datos requeridos:** iguales a RF-02, mutatis mutandis:
- `found_location` en lugar de `last_seen_location`.
- `found_at` en lugar de `last_seen_at`.
- Nombre de la mascota no aplica (se desconoce).

**Flujo principal:** análogo a RF-02, con `type=FOUND`, `status=ACTIVE`.

**Criterios de aceptación:**
- Mismos criterios de tiempo y validación que RF-02.

---

## RF-04: Subida de fotografías

**Prioridad:** Crítica
**Descripción:** El sistema debe permitir adjuntar una o más fotos al crear un reporte.

**Reglas:**
- Mínimo 1 foto obligatoria, máximo 3 (configurable).
- Formatos aceptados: JPG, PNG, WEBP, HEIC (con conversión automática si es necesario).
- Compresión/redimensionamiento automático en servidor para optimizar carga en conexiones lentas.
- Las imágenes se almacenan en almacenamiento de objetos (no en la base de datos relacional).

**Criterios de aceptación:**
- Una foto de hasta 10 MB debe subirse y procesarse sin error en conexión 3G/4G típica.
- Si falla la subida, el sistema debe informar el error sin perder el resto del formulario diligenciado.

---

## RF-05: Registro de ubicación geográfica

**Prioridad:** Crítica
**Descripción:** Todo reporte debe tener coordenadas geográficas asociadas.

**Flujo principal:**
1. El sistema solicita permiso de geolocalización del navegador.
2. Si el usuario acepta, se autocompleta la ubicación actual.
3. Si el usuario rechaza o quiere corregir, puede seleccionar manualmente un punto en un mapa interactivo.

**Reglas:**
- La ubicación se almacena como coordenadas (lat/long) + campo de texto legible (barrio/zona) cuando sea posible (reverse geocoding).
- Debe existir índice geoespacial en base de datos para búsquedas por proximidad.

**Criterios de aceptación:**
- No se puede publicar un reporte sin ubicación válida.
- El mapa debe permitir zoom y ajuste manual del pin.

---

## RF-06: Búsqueda de reportes

**Prioridad:** Crítica
**Descripción:** El sistema debe permitir buscar reportes por texto y filtros combinados.

**Flujo principal:**
1. El usuario ingresa un término de búsqueda (opcional) y/o aplica filtros.
2. El sistema retorna resultados paginados, ordenados por relevancia (proximidad + recencia por defecto).

**Criterios de aceptación:**
- Los resultados deben responder en menos de 2 segundos bajo carga normal (ver RNF-02).
- La búsqueda vacía (sin filtros) debe mostrar los reportes más recientes/cercanos por defecto.

---

## RF-07: Filtrar por especie y otras características

**Prioridad:** Alta
**Descripción:** El usuario debe poder filtrar resultados por especie, tamaño, color y tipo de reporte (perdida/encontrada).

**Criterios de aceptación:**
- Los filtros son combinables (AND lógico).
- Se debe poder limpiar todos los filtros con una acción (botón "Limpiar filtros").

---

## RF-08: Filtrar/ordenar por distancia

**Prioridad:** Crítica
**Descripción:** El sistema debe permitir buscar "cerca de mí" y filtrar por radios predefinidos.

**Reglas:**
- Radios sugeridos: 500 m, 1 km, 5 km, 10 km, "todos".
- Requiere geolocalización del usuario (o ubicación manual si la rechaza).
- Los resultados muestran la distancia aproximada al reporte.

**Criterios de aceptación:**
- Cambiar el radio actualiza los resultados sin recargar toda la página (idealmente asíncrono).

---

## RF-09: Ver detalle de un reporte

**Prioridad:** Crítica
**Descripción:** Debe existir una vista de detalle con toda la información pública del reporte.

**Contenido mínimo:**
- Foto(s) en tamaño ampliable.
- Tipo (perdida/encontrada), especie, raza, color, tamaño, sexo, descripción.
- Ubicación aproximada en mapa.
- Fecha/hora relevante ("hace X tiempo").
- Botón "Contactar por WhatsApp".
- Estado del reporte (activo/resuelto).
- Botón "Reportar contenido inapropiado".

**Criterios de aceptación:**
- La vista debe ser accesible mediante URL única y compartible (para reenviar por WhatsApp/redes).
- Debe renderizarse correctamente en dispositivos móviles.

---

## RF-10: Contacto mediante WhatsApp

**Prioridad:** Crítica
**Descripción:** El sistema debe generar un enlace `wa.me` con mensaje prellenado, sin exponer el número en texto plano en la interfaz pública.

**Flujo principal:**
1. El usuario pulsa "Contactar por WhatsApp" en el detalle del reporte.
2. El backend/frontend genera dinámicamente el enlace `https://wa.me/<numero>?text=<mensaje prellenado>`.
3. Se abre WhatsApp (app o web) con el mensaje ya redactado, editable antes de enviar.

**Reglas de privacidad:**
- El número de teléfono no debe mostrarse como texto visible/copiable en la página.
- El mensaje prellenado debe incluir referencia al nombre/tipo de mascota para dar contexto inmediato.

**Criterios de aceptación:**
- Funciona en móvil (abre app WhatsApp) y en escritorio (abre WhatsApp Web).
- Si el reporte no tiene WhatsApp válido, el botón no debe mostrarse o debe mostrar un mensaje alternativo.

---

## RF-11: Marcar reporte como resuelto/reunido

**Prioridad:** Alta
**Descripción:** Solo el creador autenticado del reporte puede marcarlo como resuelto.

**Flujo principal (reporte LOST):**
1. El creador del reporte inicia sesión y accede a "Mis reportes".
2. Selecciona "Marcar como encontrada".
3. Confirma la acción.
4. El sistema actualiza `status=RESOLVED` y registra `resolved_at`.

**Flujo principal (reporte FOUND):**
1. Análogo: el creador marca que la mascota ya fue entregada a su propietario.

**Reglas de seguridad:**
- La validación de permisos debe hacerse en el backend (no solo ocultar el botón en frontend): `if current_user.id != report.user_id → 403`.
- Un reporte resuelto puede seguir siendo visible (marcado como "Resuelto") pero no debe aparecer como activo en resultados de búsqueda por defecto.

**Criterios de aceptación:**
- Un usuario no puede resolver el reporte de otro usuario, ni siquiera manipulando la petición a la API directamente.

---

## RF-12: Reportar contenido inapropiado o falso

**Prioridad:** Alta
**Descripción:** Cualquier visitante puede señalar un reporte como spam, falso, duplicado o inapropiado.

**Flujo principal:**
1. El usuario pulsa "Reportar" en el detalle del reporte.
2. Selecciona un motivo (spam / contenido inapropiado / información falsa / duplicado / otro).
3. El sistema registra el reporte de abuso asociado al `report_id`.

**Criterios de aceptación:**
- Un reporte con múltiples señalizaciones (umbral configurable) puede ocultarse automáticamente pendiente de revisión administrativa.

---

## RF-13: Moderación administrativa

**Prioridad:** Alta
**Descripción:** El administrador debe poder ver, ocultar o eliminar reportes.

**Flujo principal:**
1. El administrador accede a un panel con lista de reportes señalados (RF-12) y/o todos los reportes.
2. Puede ver el detalle completo, ocultar (soft-delete) o eliminar definitivamente. Solo el administrador puede eliminar definitivamente, mientras que los usuarios solo pueden hacer soft-delete.
3. Las acciones quedan registradas con marca de tiempo y administrador responsable.

**Criterios de aceptación:**
- Un reporte oculto no aparece en búsquedas públicas ni en el feed, pero puede conservarse para auditoría.
- Solo cuentas con rol `ADMIN` acceden a este panel (validado en backend).

---

## RF-14: Sugerencia de posibles coincidencias (matching básico por reglas)

**Prioridad:** Media/Alta
**Descripción:** El sistema debe sugerir reportes potencialmente relacionados, sin usar IA/computer vision, mediante un score por reglas.

**Criterios usados para el score (ejemplo de pesos):**
| Criterio | Peso aproximado |
|---|---|
| Especie coincide | 25% |
| Proximidad geográfica | 30% |
| Color coincide | 15% |
| Tamaño coincide | 10% |
| Sexo coincide | 5% |
| Cercanía temporal | 15% |

**Reglas de proximidad geográfica (gradiente):**
- 0–500 m → muy alta
- 500 m–2 km → alta
- 2–5 km → media
- 5–10 km → baja
- >10 km → muy baja

**Presentación al usuario:**
- No mostrar el score numérico crudo (ej. "91%"). Mostrar categorías: **Alta coincidencia / Posible coincidencia / Baja coincidencia**.
- El matching debe ser **bidireccional**: un reporte LOST sugiere FOUND compatibles, y viceversa.

**Flujo principal:**
1. Al crear o ver un reporte LOST, el sistema calcula candidatos FOUND activos con score por encima de un umbral mínimo.
2. Se muestra una sección "Posibles coincidencias" en el detalle del reporte y/o en el feed del usuario.

**Criterios de aceptación:**
- El cálculo debe excluir reportes ya `RESOLVED`.
- El listado de coincidencias se actualiza cuando se crean nuevos reportes compatibles (no requiere ser en tiempo real estricto; puede ser al recargar/consultar).
- Los atributos marcados como desconocidos/no especificados no deben penalizar negativamente el score de coincidencia.

---

## RF-15: Feed / página principal de reportes recientes

**Prioridad:** Alta
**Descripción:** La página principal debe mostrar reportes relevantes sin que el usuario tenga que buscar activamente.

**Estructura sugerida (orden de aparición):**
1. Accesos directos: "Perdí mi mascota" / "Encontré una mascota".
2. "Cerca de ti" (usa geolocalización).
3. "Posibles coincidencias para ti" (si el usuario tiene reportes activos: requiere RF-14).
4. "Reportes recientes" (ordenados por proximidad + recencia, no solo cronológico).

**Criterios de aceptación:**
- El feed debe cargar de forma progresiva (paginación o scroll infinito) para no penalizar el rendimiento.
- Cada tarjeta de reporte debe mostrar: foto, tipo, especie/color/tamaño resumido, distancia, tiempo relativo ("hace 35 min").

---

## RF-16: Estadísticas públicas

**Prioridad:** Media
**Descripción:** El sistema debe mostrar métricas agregadas relevantes para la emergencia, no métricas de vanidad del producto.

**Métricas incluidas:**
| Métrica | Cálculo |
|---|---|
| Mascotas reportadas | Total de reportes (`LOST` + `FOUND`) |
| Reportes de mascotas perdidas | Total `type=LOST` |
| Reportes de mascotas encontradas | Total `type=FOUND` |
| Mascotas reunidas | Total `LOST` con `status=RESOLVED` (confirmado por el propietario) |
| Tiempo promedio de reencuentro | Promedio de `resolved_at - lost_at` sobre reportes resueltos |
| Actividad últimas 24h (opcional) | Nuevos reportes, encontrados y reencuentros en ese período |

**Reglas importantes:**
- **"Encontrada" ≠ "Reunida".** Un reporte `FOUND` creado por un tercero no incrementa automáticamente el contador de "reunidas"; solo la confirmación del propietario en su reporte `LOST` lo hace (ver RF-11).
- No se muestran métricas de vanidad (usuarios registrados, visitas, fotos subidas, búsquedas realizadas).

**Criterios de aceptación:**
- Las estadísticas deben recalcularse en tiempo cuasi-real o mediante job periódico (según carga esperada).
- Los números deben ser consistentes con los datos subyacentes (auditable).

---

## RF-17: Editar reporte

**Prioridad:** Alta
**Descripción:** El creador autenticado de un reporte debe poder editar la información de su propio reporte después de publicarlo, para corregir datos o actualizarlos (por ejemplo, cambiar la última ubicación vista, añadir una foto adicional o ajustar la descripción).

**Campos editables:**
| Campo | Editable | Notas |
|---|---|---|
| Nombre de la mascota | Sí | Solo aplica a reportes `LOST` |
| Especie | No | No se permite cambiar el tipo de animal de un reporte ya publicado, para evitar que se reutilice un reporte con matching/estadísticas ya generadas. Si el usuario se equivocó de especie, debe eliminar el reporte y crear uno nuevo. |
| Raza | Sí | |
| Sexo | Sí | |
| Color | Sí | |
| Tamaño | Sí | |
| Descripción libre | Sí | |
| Fotografías | Sí | Agregar o eliminar, respetando mínimo 1 y máximo configurado (ver RF-04) |
| Ubicación (última vista / encontrada) | Sí | Reabre el selector de mapa (ver RF-05) |
| Fecha/hora | Sí | No puede ser una fecha futura |
| WhatsApp de contacto | Sí | Debe seguir siendo obligatorio y válido |
| Tipo de reporte (`LOST`/`FOUND`) | No | No editable; requiere crear un nuevo reporte |
| Estado (`ACTIVE`/`RESOLVED`) | No (aquí) | Se gestiona exclusivamente mediante RF-11, no desde el formulario de edición |

**Flujo principal:**
1. El usuario autenticado accede a "Mis reportes".
2. Selecciona un reporte propio y pulsa "Editar".
3. El sistema precarga el formulario con los datos actuales (mismo componente usado en RF-02/RF-03, en modo edición).
4. El usuario modifica los campos necesarios.
5. El sistema valida los campos igual que en la creación (obligatorios, formato, mínimo de fotos, ubicación válida, WhatsApp válido).
6. Al guardar, se actualiza el registro y se refresca `updated_at`.

**Reglas de seguridad:**
- La edición solo está disponible para usuarios autenticados que sean dueños del reporte (`current_user.id == report.user_id`).
- La validación de propiedad debe hacerse en el backend, no solo ocultando el botón "Editar" en el frontend: `if current_user.id != report.user_id → 403`.
- Un reporte con `status=RESOLVED` puede seguir siendo editable (por ejemplo, para corregir un dato histórico), pero esto no debe reactivarlo ni volver a mostrarlo como `ACTIVE` en búsquedas.
- Un administrador puede editar cualquier reporte con fines de moderación (opcional, puede diferirse fuera del MVP si no es indispensable).

**Impacto en otras funcionalidades:**
- Si se edita la ubicación, color, tamaño, sexo o fecha, el sistema debe **recalcular el matching** (RF-14) para ese reporte, ya que estos campos afectan directamente el score de coincidencia.
- El historial de ediciones no es necesario para el MVP (no se requiere versionado ni auditoría de cambios en esta fase).

**Criterios de aceptación:**
- Un usuario no puede editar un reporte que no le pertenece, ni siquiera manipulando directamente la petición a la API.
- Guardar cambios sin modificar ningún campo no debe generar errores ni duplicar el reporte.
- Si el usuario cancela la edición, no se guardan cambios parciales.
- Los reportes editados deben reflejar los cambios inmediatamente en el feed, la búsqueda y el detalle público.

---

## Notas de diseño transversales (aplican a varios RF)

1. **Fricción mínima de registro:** ningún RF de creación de reporte (RF-02, RF-03) debe exigir cuenta previa. Se puede ofrecer "reclamar este reporte" después de publicado, creando cuenta a posteriori.
2. **Modelo de datos simplificado:** se recomienda una única tabla `PetReport` con campo `type = LOST | FOUND` y `status = ACTIVE | RESOLVED | CLOSED`, en lugar de dos entidades separadas.
3. **Formulario por pasos:** todos los formularios de creación de reporte deben seguir el patrón de pasos cortos (tipo → foto → características → ubicación → contacto → publicar), optimizado para completarse en menos de 1 minuto desde móvil. El mismo componente debe poder reutilizarse en modo edición (RF-17), precargado con los datos existentes.
4. **Seguridad de autorización:** cualquier acción de modificación de estado o contenido (RF-11, RF-13, RF-17) debe validarse siempre en el backend, nunca confiar solo en la ocultación de botones en el frontend.

--- 

## Stack tecnológico

Frontend:  React + Leaflet/OSM + Vercel (Hobby)
Backend:   NestJS desplegado en Render
Base de datos: PostgreSQL + PostGIS desplegado en Supabase
Imágenes:  Cloudinary (free)
Auth:      Google OAuth 2.0 (vía Passport)
CI/CD:     GitHub + GitHub Actions
Monitoreo: Uptime Robot + Sentry (free)
