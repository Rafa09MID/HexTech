# HexTech // SPHEREx Explorer

> **NASA Space Apps Challenge 2026** — *Planet X and SPHEREx*
> Herramienta web interactiva para exploración espectral, detección astrométrica y seguimiento de candidatos con datos de la misión **SPHEREx** (Caltech / IPAC / IRSA).

---

## 🌌 Características de la Aplicación (Frontend)

- **Visor Celeste Multiespectral & Motor Híbrido:**
  - Integración fluida con **Aladin Lite v3** y catálogo astronómico CDS / HiPS.
  - Rueda de filtros científicos: `sRGB`, `Raw` y `Wavelength`.
  - Capas de catálogos estelares e infrarrojos: **Gaia DR3** y **AllWISE**.
  - **Espectro al vuelo (On-The-Fly):** Clic en cualquier estrella o región del cielo para generar de forma dinámica su espectro continuo de 102 bandas.

- **Panel de 6 Detectores LVF & Comparador Multi-Época:**
  - Co-adición de los 6 conjuntos detectores HgCdTe ($\text{LVF-1}$ a $\text{LVF-6}$, rango espectral $0.75 - 5.00\,\mu\text{m}$).
  - Comparador de barridos temporales: Época base $T_1$, Segundo barrido $T_2$, **Resta ($T_2 - T_1$)** para aislar dipolos en movimiento y **Suma ($T_1 + T_2$)** para potenciar el SNR en $+41\%$.

- **Expediente de Candidato & Bitácora MPC:**
  - Dashboard ejecutivo de astrometría de alta precisión.
  - Tarjetas de KPIs numéricos: Movimiento Propio ($\mu$), Ajuste Lineal ($R^2$), Velocidad Horaria MPC, Variabilidad Fotométrica ($\Delta\text{mag}$) y Cadencia.
  - Tabla interactiva de observaciones WCS con flags HDU y exportación a formatos oficiales: **ADES-PSV (Minor Planet Center)**, **CSV**, **JSON** y **Ficha PDF**.

- **AllSkyCube: Interpretaciones 3D y 2D:**
  - **Interpretación 3D:** Visualizador isométrico del cubo espectral ($\text{RA} \times \text{Dec} \times \lambda$) con 102 capas apiladas, auto-rotación y scrubber deslizante.
  - **Interpretación 2D:** Corte fotométrico en el plano espacial $\text{RA} \times \text{Dec}$ con retícula de centroide para la capa seleccionada.

---

## 🛠️ Tecnologías

- **React 18** + **TypeScript**
- **Vite**
- **Tailwind CSS**
- **Recharts**
- **Lucide React**
- **Aladin Lite API v3**

---

## 🚀 Instalación y Uso Local

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev

# 3. Ejecutar pruebas unitarias
npm run test

# 4. Compilar para producción
npm run build
```

El servidor local corre por defecto en: **`http://localhost:5173/`**
