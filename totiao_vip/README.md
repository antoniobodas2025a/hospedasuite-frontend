# Totiao VIP Landing Page

Landing page estática aislada para el lanzamiento del restaurante Totiao.

## Estructura
```
totiao_vip/
├── index.html       # Página principal (autocontenida)
├── assets/          # Carpeta para imágenes futuras
└── README.md        # Estas instrucciones
```

## Cómo desplegar

1. **Sube la carpeta completa** `totiao_vip` al directorio público de tu servidor (ej. `public_html` en cPanel o `/var/www/html` en Nginx/Apache).

2. **Acceso**: La página estará disponible en:
   ```
   https://hospedasuite.com/totiao_vip
   ```

3. **Verificación**: Abre esa URL en tu celular. Deberías ver el fondo oscuro, el titular "El verdadero CRUNCH está por llegar..." y el botón naranja "Quiero mi Acceso VIP".

## Notas técnicas
- **Cero dependencias**: No requiere Node.js, npm ni build steps.
- **Tailwind vía CDN**: Se carga desde `cdn.tailwindcss.com` (fricción cero).
- **Aislamiento total**: No comparte código, estilos ni scripts con HospedaSuite. Vive en su propio directorio.
- **Mobile-first**: Optimizada para pantallas de 320px a 430px (iPhone/Android).

## Personalización
- **Logo**: Reemplaza el emoji 🥩 en `index.html` por una imagen real en `assets/logo.png`.
- **WhatsApp**: El enlace del botón ya incluye el mensaje prellenado. Si cambia el número, agrega el número después de `wa.me/` (ej. `wa.me/573001234567`).
