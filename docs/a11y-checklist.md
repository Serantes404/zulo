# Lista de comprobación de accesibilidad (manual)

Lo que no se puede automatizar sin navegador. Márcalo en el móvil y en el escritorio antes del despliegue.

## Móvil (iPhone / Android)

1. **VoiceOver / TalkBack, entrar y crear grupo:** en `/login` cada campo se lee con su etiqueta (Email, Contraseña) y el error se anuncia una sola vez.
2. **Plano del almacén:** las zonas se leen como botones con nombre y estado (prestado / vencido); la lista "Zonas" permite abrir cualquiera sin tocar el plano.
3. **Abrir y cerrar una zona (sheet):** el foco entra en el sheet y, al cerrarlo con "Cerrar", vuelve a la zona que lo abrió.
4. **Coger material:** los botones de cantidad ("Quitar una unidad", "Añadir una unidad") se leen bien y el toast de confirmación se anuncia una sola vez.
5. **Diálogo de confirmación (AlertDialog):** al abrirlo, el foco está en "Cancelar", no en el botón destructivo.
6. **Zoom de texto / 200 %:** ajusta el tamaño del texto del sistema al máximo; no hay texto cortado ni scroll horizontal en Mis grupos, plano, ficha de material y formulario de préstamo.
7. **Reducir movimiento (Ajustes > Accesibilidad):** desaparecen el pulso de la zona (queda un anillo fijo), el zoom del plano y las transiciones del sheet; en el editor, la línea de escaneo queda quieta.
8. **Toque con el pulgar:** pestañas, botones de cerrar y "Ver todo" se aciertan a la primera (objetivo mínimo 44 px).

## Escritorio

9. **Solo teclado en el editor del plano:** Tab llega a "Salir del editor", zonas, botones de mover/redimensionar (flechas) y guardar; el anillo de foco se ve siempre; nunca hay trampa de foco fuera de un diálogo.
10. **Enlace "Saltar al contenido":** la primera pulsación de Tab lo muestra y Intro lleva al contenido.
11. **Esc y foco en diálogos y menús:** Esc cierra el diálogo/sheet/menú y el foco vuelve al botón que lo abrió.
12. **Zoom del navegador al 200 %:** el plano y el panel de zona siguen usables; las pestañas de Mis préstamos no se solapan.
13. **Modo oscuro (sistema):** el texto, los bordes del plano (`--plan-line`) y los anillos de foco se distinguen; la leyenda del plano (reloj y triángulo) es legible.
14. **Error toast:** provoca un error (p. ej. subir una foto de más de 5 MB); el toast se anuncia una vez y dura unos 8 s (los normales, 4 s).
15. **Título de pestaña:** al navegar por las pantallas, la pestaña muestra títulos distintos ("Mis grupos · Zulo", "Editar plano · Zulo", ...).

## Opcional, si tienes un rato

- Lighthouse (pestaña Accesibilidad) y la extensión axe DevTools en: login, Mis grupos, plano, ficha de material, editor, Mis préstamos. Objetivo: 0 errores críticos.
