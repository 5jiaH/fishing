export default function Slide({ menu }) {
  const { Menu } = antd;
  const { useContext } = React;
  const { openOrActivateTab, activePath } = useContext(globalContext);

  return (
    <aside>
      <Menu
        mode="inline"
        selectedKeys={activePath ? [activePath] : []}
        onSelect={(e) => openOrActivateTab(e.key)}
        style={{ width: '100%' }}
        items={menu}
      />
    </aside>
  );
}
