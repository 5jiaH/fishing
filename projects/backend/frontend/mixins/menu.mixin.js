function menuOptions() {
  return [
    {
      key: '/web/index/overview',
      label: '概况',
    },
    {
      type: 'divider',
    },
    {
      key: 'ability',
      label: '功能',
      type: 'group',
      children: [
        { key: '/web/ability/scheduled', label: '定时任务' },
        { key: '/web/ability/logs', label: '错误日志' },
        {
          key: '/web/monitor/index',
          label: '监控',
        },
      ],
    },

    {
      type: 'divider',
    },
    {
      key: 'account',
      label: '账号管理',
      type: 'group',
      children: [{ key: '/web/account/auth', label: '权限管理' }],
    },
  ];
}

function getFirstMenuKey(menus) {
  for (let index in menus) {
    const item = menus[index];
    if (item.children && item.children.length) {
      return item.children[0].key;
    }
    if (item.key) {
      return item.key;
    }
  }
  return null;
}

export default function () {
  const menus = menuOptions();

  return [getFirstMenuKey(menus), menus];
}
