//Layout container

export default {
  messages: {
		permission: 'ichat.messages.index',
		activated: true,
    authenticated: true,
		path: '/chat/messages',
		name: 'qchat.admin.messages.index',
    page: () => import('@imagina/qchat/_layouts/admin/messages/index'),
    layout: () => import('@imagina/qsite/_layouts/master.vue'),
		title: 'qchat.sidebar.adminMessages',
		icon: 'far fa-comments',
	},
  conversation:{
    permission: null,
    activated: true,
    authenticated: true,
    path: '/chat/conversation/:id',
    name: 'qchat.admin.conversation.show',
    page: () => import('@imagina/qchat/_layouts/admin/messages/index'),
    layout: () => import('@imagina/qsite/_layouts/master.vue'),
    title: 'qchat.sidebar.adminMessages',
    icon: 'far fa-comments',
  },
}
