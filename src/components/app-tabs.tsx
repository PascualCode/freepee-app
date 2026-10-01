import { TabList, TabSlot, Tabs, TabTrigger } from 'expo-router/ui';

// La plantilla inicial de create-expo-app traía aquí una barra de pestañas
// nativa (`NativeTabs` de `expo-router/unstable-native-tabs`, con iconos de
// ejemplo "Home"/"Explore") que nunca se sustituyó por algo de pipiApp — no
// es un componente de la app, es contenido de la plantilla. La navegación
// real de pipiApp usa `BottomNavBar` (ver `nearby-markers-map.tsx`), no un
// tab bar inferior de Expo Router — visible como una barra "Home"/"Explore"
// al pie de la pantalla en la primera prueba en un dispositivo Android real.
//
// `<TabList>` no puede eliminarse del todo: `Tabs`/`TabSlot` (de
// `expo-router/ui`) necesitan que su `<TabTrigger>` registre qué rutas
// existen — sin él, la app lanza "Couldn't find any screens for the
// navigator" y no arranca. Se mantiene, pero oculto (`display: 'none'`)
// para que siga registrando la ruta sin dibujar nada en pantalla.
export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList style={{ display: 'none' }}>
        <TabTrigger name="home" href="/" />
      </TabList>
    </Tabs>
  );
}
