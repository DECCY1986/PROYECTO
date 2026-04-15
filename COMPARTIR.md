# Guía para Compartir DIMALCCO con tu Equipo

Para que tu equipo de trabajo pueda acceder a la plataforma y todos vean la misma información sincronizada, sigue estos pasos:

## 1. Subir el Código (Compartir Archivos)
Tienes dos opciones principales para que tus compañeros abran la plataforma:

### Opción A: GitHub Pages (Recomendada)
Es la forma más profesional. Permite que todos accedan mediante una URL (ej: `https://tu-usuario.github.io/PROYECTO`).
1. Crea un repositorio en GitHub y sube todos los archivos de la carpeta `PROYECTO`.
2. Ve a **Settings > Pages**.
3. En "Branch", selecciona `main` o `master` y haz clic en **Save**.
4. ¡Listo! En unos minutos tendrás un enlace web para compartir.

### Opción B: Carpeta Compartida (Local)
Si están en la misma oficina, puedes copiar la carpeta `PROYECTO` en un servidor local o un servicio como OneDrive/Dropbox para que todos tengan los archivos.

---

## 2. Sincronizar los Datos (Base de Datos Única)
Para que todos vean lo mismo que tú has guardado:
1. Abre la plataforma (el archivo `index.html`).
2. Haz clic en el engranaje **"Ajustes IA"** (esquina superior derecha).
3. Busca el campo **ID DE SINCRONIZACIÓN (GIST)**.
4. Pega el ID de tu base de datos actual. 
   > **Tip:** Puedes encontrar tu ID actual en tus ajustes. Si no tienes uno, al presionar el ícono de la nube por primera vez en la barra lateral se creará uno automáticamente.
5. Haz clic en **Guardar**. La página preguntará si quieres descargar los datos. Di que sí.

---

## 3. Configurar el Asistente IA
Cada miembro del equipo debe configurar su propia llave de Anthropic si desean usar el chat de IA de forma independiente, o puedes compartir una llave común:
1. En **Ajustes IA**, ingresa la **Anthropic API Key**.
2. Presiona **Guardar**.

---

## Resumen para el Equipo
Envía este mensaje a tus compañeros una vez que hayas implementado lo anterior:

> "Hola equipo, para entrar a Dimalcco: 
> 1. Entren a este enlace: `[TU_URL_AQUÍ]`
> 2. Vayan a **Ajustes IA** e ingresen este ID de Sincronización: `[TU_ID_DE_GIST_AQUÍ]`
> 3. Acepten la descarga de datos. 
> ¡Ya pueden ver y actualizar todo!"
