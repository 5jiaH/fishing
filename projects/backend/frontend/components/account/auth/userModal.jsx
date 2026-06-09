export default function UserModal({ status, type, form, submitting, onSubmit, onClose }) {
  const { Modal, Form, Input, Select } = antd;
  const isCreate = type === 'create';

  return (
    <Modal
      title={isCreate ? '添加用户' : '编辑用户'}
      open={status}
      onOk={onSubmit}
      onCancel={onClose}
      confirmLoading={submitting}
      destroyOnClose
      width={480}
    >
      <Form form={form} layout="vertical" className="mt-2">
        <Form.Item
          name="username"
          label="用户名"
          rules={[{ required: true, message: '请输入用户名' }]}
        >
          <Input placeholder="登录名" autoComplete="off" />
        </Form.Item>

        <Form.Item
          name="password"
          label={isCreate ? '密码' : '新密码（留空不改）'}
          rules={isCreate ? [{ required: true, message: '请输入密码' }] : []}
        >
          <Input.Password
            placeholder={isCreate ? '' : '不修改请留空'}
            autoComplete="new-password"
          />
        </Form.Item>

        <Form.Item name="cover" label="头像 URL">
          <Input placeholder="可选" />
        </Form.Item>

        <Form.Item
          name="disabled"
          label="账号状态"
          rules={[{ required: true }]}
        >
          <Select
            options={[
              { value: 0, label: '正常' },
              { value: 1, label: '停用' },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
