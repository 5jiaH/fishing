declare namespace AccountItf {
  export type userResponse = {
    id: number;
    username: string;
    cover?: string;
    create_time: Date;
    update_time: Date;
    disabled: number;
    ip?: string;
    role: 'A' | 'U';
  };

  export type user = Omit<userResponse, 'create_time' | 'update_time'> & {
    password: string;
  };
}
