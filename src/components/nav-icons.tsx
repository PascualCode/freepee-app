import { View } from 'react-native';

interface IconProps {
  size?: number;
  color?: string;
}

// Iconos monocromos construidos a mano con Views planas — sin
// `react-native-svg` ni ninguna librería de iconos (mismo criterio que el
// resto de la app, ver CLAUDE.md → Notas técnicas → icono mostrar/ocultar
// contraseña). Se usan solo dentro de BottomNavBar y el avatar de
// nearby-markers-map.tsx, ambos superficies de color fijo (blanco) — por
// eso el color de "recorte" del bookmark está fijado a blanco en vez de
// heredar un fondo variable.
export function BookmarkIcon({ size = 20, color = '#000000' }: IconProps) {
  const width = size * 0.7;
  const notchHeight = size * 0.4;
  return (
    <View style={{ width, height: size, backgroundColor: color }}>
      {/* Triángulo CSS clásico (borde transparente a los lados, coloreado
          arriba) apuntando hacia arriba, superpuesto en blanco sobre el
          rectángulo — recorta la "V" de la cinta del marcapáginas sin
          depender de un pivote de rotación. */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: 0,
          height: 0,
          borderLeftWidth: width / 2,
          borderRightWidth: width / 2,
          borderBottomWidth: notchHeight,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: '#ffffff',
        }}
      />
    </View>
  );
}

export function PersonIcon({ size = 20, color = '#000000' }: IconProps) {
  const headSize = size * 0.42;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' }}>
      <View
        style={{
          width: headSize,
          height: headSize,
          borderRadius: headSize / 2,
          backgroundColor: color,
          marginBottom: size * 0.06,
        }}
      />
      <View
        style={{
          width: size * 0.88,
          height: size * 0.46,
          borderTopLeftRadius: size * 0.44,
          borderTopRightRadius: size * 0.44,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

export function SearchIcon({ size = 20, color = '#000000', background = '#ffffff' }: IconProps & { background?: string }) {
  // Aro RELLENO (dos círculos concéntricos, no un borderWidth) en vez de un
  // trazo fino — un intento anterior con `borderWidth` dejaba un hueco
  // visible donde el mango debía tocar el aro (el trazo solo cubre una
  // banda fina, así que cualquier pequeño desajuste de subpíxel se notaba).
  // Con un disco MACIZO como capa intermedia, cualquier solape del mango por
  // debajo del disco queda tapado por completo sin depender de acertar
  // exactamente en el borde — estructuralmente no puede quedar un hueco.
  const outerSize = size * 0.82;
  const radius = outerSize / 2;
  const thickness = outerSize * 0.24;
  const innerSize = outerSize - thickness * 2;
  const handleWidth = thickness;
  const handleLength = size * 0.8;
  // Sobra de solape generosa (más que el grosor del aro): el extremo
  // cercano del mango queda claramente por debajo del disco relleno, y la
  // parte que se adentra en el hueco central la tapa el círculo blanco.
  const overlap = thickness * 1.5;
  const diagonal = radius - overlap + handleLength / 2;
  const centerX = radius + diagonal * Math.SQRT1_2;
  const centerY = radius + diagonal * Math.SQRT1_2;
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: 'absolute',
          left: centerX - handleWidth / 2,
          top: centerY - handleLength / 2,
          width: handleWidth,
          height: handleLength,
          borderRadius: handleWidth / 2,
          backgroundColor: color,
          transform: [{ rotate: '125deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: outerSize,
          height: outerSize,
          borderRadius: radius,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: thickness,
          left: thickness,
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize / 2,
          backgroundColor: background,
        }}
      />
    </View>
  );
}

// Icono clásico de "mi ubicación" (retícula): aro + 4 marcas cardinales +
// punto central. Mismo truco de círculos concéntricos que SearchIcon para
// el aro (recorta un disco macizo en vez de depender de un `borderWidth`
// fino) — `background` recorta el hueco del aro contra la superficie donde
// vive el icono (blanco fijo por defecto, ver comentario de más arriba).
export function LocateIcon({ size = 20, color = '#000000', background = '#ffffff' }: IconProps & { background?: string }) {
  const center = size / 2;
  const ringOuter = size * 0.56;
  const ringThickness = ringOuter * 0.18;
  const ringInner = ringOuter - ringThickness * 2;
  const dotSize = size * 0.16;
  const tickLength = size * 0.22;

  return (
    <View style={{ width: size, height: size }}>
      <View style={{ position: 'absolute', top: 0, left: center - ringThickness / 2, width: ringThickness, height: tickLength, backgroundColor: color }} />
      <View style={{ position: 'absolute', bottom: 0, left: center - ringThickness / 2, width: ringThickness, height: tickLength, backgroundColor: color }} />
      <View style={{ position: 'absolute', left: 0, top: center - ringThickness / 2, width: tickLength, height: ringThickness, backgroundColor: color }} />
      <View style={{ position: 'absolute', right: 0, top: center - ringThickness / 2, width: tickLength, height: ringThickness, backgroundColor: color }} />
      <View
        style={{
          position: 'absolute',
          top: center - ringOuter / 2,
          left: center - ringOuter / 2,
          width: ringOuter,
          height: ringOuter,
          borderRadius: ringOuter / 2,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: center - ringInner / 2,
          left: center - ringInner / 2,
          width: ringInner,
          height: ringInner,
          borderRadius: ringInner / 2,
          backgroundColor: background,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: center - dotSize / 2,
          left: center - dotSize / 2,
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

// Icono de "info" (círculo relleno + "i") para el botón de leyenda del mapa
// — mismo truco que el resto: formas en `background` recortadas sobre un
// disco macizo, nunca `borderWidth` fino.
export function InfoIcon({ size = 20, color = '#000000', background = '#ffffff' }: IconProps & { background?: string }) {
  const dotSize = size * 0.14;
  const barWidth = size * 0.14;
  const barHeight = size * 0.32;
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
      <View
        style={{
          position: 'absolute',
          top: size * 0.22,
          left: (size - dotSize) / 2,
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: background,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.46,
          left: (size - barWidth) / 2,
          width: barWidth,
          height: barHeight,
          borderRadius: barWidth / 2,
          backgroundColor: background,
        }}
      />
    </View>
  );
}

// Rota (x,y) `degrees` grados en el mismo sentido que `transform: [{rotate}]`
// de RN (positivo = horario, coordenadas de pantalla con Y hacia abajo).
function rotatePoint(x: number, y: number, degrees: number): { x: number; y: number } {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

// Corazón (favoritos). Un primer intento (círculo + círculo + cuadrado
// rotado, el truco CSS más clásico) dejaba una costura visible a cada lado
// — donde el arco del círculo debía continuar en la arista recta del
// cuadrado, los dos radios no encajaban entre sí (dos formas
// independientes con proporciones sueltas, sin relación matemática entre
// ellas) y se veía como si la mitad de arriba y la de abajo no
// coincidieran. Reconstruido con **una sola pieza continua por mitad**
// (forma de "lápida" — arriba un semicírculo, abajo recta — mismo
// `pieceWidth`/`pieceHeight` para las dos), rotada ±45° alrededor de un
// punto de pivote común: al ser una única forma por mitad, no hay dos
// bordes independientes que tengan que casar por coincidencia, así que la
// costura no puede aparecer. Cada pieza se posiciona (vía `rotatePoint`)
// para que su propio centro caiga donde hace falta para que, tras la
// rotación de RN (siempre alrededor del centro del elemento), su esquina
// inferior aterrice exactamente en el punto de pivote — ahí es donde se
// juntan las dos mitades, formando la punta del corazón.
export function HeartIcon({ size = 20, color = '#000000' }: IconProps) {
  const pieceWidth = size * 0.62;
  const pieceHeight = size * 0.83;
  const pivotX = size * 0.5;
  const pivotY = size * 0.9;

  // Mitad derecha: rota -45°, su esquina inferior-IZQUIERDA es la que
  // debe caer en el pivote (vector desde su propio centro: (-W/2, H/2)).
  const rightCornerOffset = rotatePoint(-pieceWidth / 2, pieceHeight / 2, -45);
  const rightCenter = { x: pivotX - rightCornerOffset.x, y: pivotY - rightCornerOffset.y };

  // Mitad izquierda: espejo — rota +45°, esquina inferior-DERECHA.
  const leftCornerOffset = rotatePoint(pieceWidth / 2, pieceHeight / 2, 45);
  const leftCenter = { x: pivotX - leftCornerOffset.x, y: pivotY - leftCornerOffset.y };

  const pieceBaseStyle = {
    position: 'absolute' as const,
    width: pieceWidth,
    height: pieceHeight,
    backgroundColor: color,
    // Semicírculo completo arriba (radio = mitad del ancho), recta abajo.
    borderTopLeftRadius: pieceWidth / 2,
    borderTopRightRadius: pieceWidth / 2,
  };

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          pieceBaseStyle,
          {
            left: rightCenter.x - pieceWidth / 2,
            top: rightCenter.y - pieceHeight / 2,
            transform: [{ rotate: '-45deg' }],
          },
        ]}
      />
      <View
        style={[
          pieceBaseStyle,
          {
            left: leftCenter.x - pieceWidth / 2,
            top: leftCenter.y - pieceHeight / 2,
            transform: [{ rotate: '45deg' }],
          },
        ]}
      />
    </View>
  );
}

export function SlidersIcon({ size = 20, color = '#000000' }: IconProps) {
  const knobPositions = [0.28, 0.7, 0.45];
  return (
    <View style={{ width: size, height: size, justifyContent: 'space-between' }}>
      {knobPositions.map((pos, i) => (
        <View key={i} style={{ height: 2, backgroundColor: color, borderRadius: 1 }}>
          <View
            style={{
              position: 'absolute',
              top: -3,
              left: size * pos - 4,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: color,
            }}
          />
        </View>
      ))}
    </View>
  );
}
