<template>
  <div id="advanceChatComponent">
    <div id="advanceChatComponentContent" class="relative-position">
      <div class="row">
        <!-- Rooms List -->
        <div v-if="!roomId" style="width: 300px">
          <!-- Header -->
          <div class="row q-pa-sm justify-between">
            <!--Search-->
            <dynamic-field v-model="roomsPagination.search" :field="dynamicfields.search"
                           @input="handleSearch"/>
            <!--New Room-->
            <q-btn color="primary" round unelevated @click="modalNewRoom.show = true">
              <label class="text-h5 cursor-pointer">+</label>
            </q-btn>
          </div>
          <!-- List -->
          <div ref="listRoomsContent" :style="`max-height: calc(${height} - 58px); overflow-y: scroll`">
            <div v-if="!rooms.length && loading.rooms" class="row justify-center q-my-md">
              <q-spinner-dots color="primary" size="40px"/>
            </div>
            <q-infinite-scroll @load="(index, done) => getRooms({index, done})" :offset="50"
                               :scroll-target="$refs.listRoomsContent" ref="infiniteScroll" debounce="300">
              <q-item v-for="(chat, index) in rooms" :key="index" class="q-pl-sm" clickable
                      @click.native="openRoomId = chat.roomId">
                <q-item-section top avatar class="q-pr-sm"
                                style="min-width: 48px; max-width: 48px">
                  <q-avatar><img :src="chat.avatar"></q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-body2 text-blue-grey text-weight-bold" lines="1">
                    {{ chat.roomName }}
                  </q-item-label>
                  <q-item-label caption v-if="chat.phone" class="text-blue-grey">
                    <q-icon name="fa-light fa-phone" class="q-mr-xs"/>
                    {{ chat.phone }}
                  </q-item-label>
                  <q-item-label caption lines="1">
                    <q-icon name="fa-light fa-message" class="q-mr-xs"/>
                    {{ chat.lastMessage.content }}
                  </q-item-label>
                </q-item-section>

                <q-item-section side top>
                  <q-item-label caption>{{ chat.lastMessage.timestamp }}</q-item-label>
                  <q-badge v-if="chat.unreadCount" color="primary" class="q-mt-sm"
                           text-color="white" :label="chat.unreadCount"/>
                </q-item-section>
              </q-item>
              <template v-slot:loading>
                <div class="row justify-center q-my-md">
                  <q-spinner-dots color="primary" size="40px"/>
                </div>
              </template>
            </q-infinite-scroll>
          </div>
        </div>
        <!--Chat component-->
        <div class="col">
          <chat-window id="vueAdvanceChat" v-bind="chatProps" @send-message="sendMessage"
                       @add-room="modalNewRoom.show = true" @menu-action-handler="menuActionHandler"
                       @open-file="({message}) => $helper.openExternalURL(message.files[0].url, true)"
                       @fetch-messages="getMessages" @fetch-more-rooms="getRooms" @open-failed-message="showError"/>
        </div>
      </div>
      <!--Dialog to new room-->
      <master-modal v-model="modalNewRoom.show" :loading="modalNewRoom.loading"
                    :title="`${$tr('isite.cms.label.new')} ${$tr('isite.cms.label.chat')}`">
        <div>
          <!-- Type -->
          <dynamic-field v-model="newRoom.type" :field="fieldsToNewRooms.type"/>
          <!-- Form Type -->
          <dynamic-form v-model="newRoom.form" v-if="fieldsToNewRooms.blocks[newRoom.type]"
                        :blocks="fieldsToNewRooms.blocks[newRoom.type]"
                        default-col-class="col-12" @submit="createRoom"/>
        </div>
      </master-modal>
    </div>
  </div>
</template>
<script>
//Components
import ChatWindow from 'vue-advanced-chat'
import 'vue-advanced-chat/dist/vue-advanced-chat.css'

export default {
  beforeDestroy() {
    this.$eventBus.$off('inotification.chat.message')
  },
  props: {
    accept: {default: '.pdf, .xlsx, .docx, .pptx, .mp4, .mp3, .jpg, image/*'},
    roomId: {default: false},
    roomsId: {default: false},
    allowCreateChat: {default: false},
    allowProviders: {type: Boolean, defualt: false},
    height: {default: '600px'},
    advancedProps: {default: false},
    loadRooms: {default: true}
  },
  components: {ChatWindow},
  watch: {
    roomId() {
      this.getRooms()
    },
    roomsId() {
      this.getRooms()
    },
    openRoomId(newValue) {
      this.$emit('room-opened', newValue)
    }
  },
  mounted() {
    this.$nextTick(function () {
      this.init()
    })
  },
  data() {
    return {
      conversations: [],
      conversationMessages: [],
      openRoomId: null,
      chatPagination: {
        page: 0,
        perPage: 50,
        lastPage: -1
      },
      loading: {
        rooms: false,
        messages: false,
      },
      search: {
        userId: null,
        userList: []
      },
      modalNewRoom: {
        show: false,
        loading: false
      },
      newRoom: {
        type: 'user',
        form: {
          userId: null,
          providerType: null,
          providerId: null,
          firstName: null,
          lastName: null
        }
      },
      providers: {
        whatsapp: {
          image: `${this.$store.state.qsiteApp.baseUrl}/modules/isite/img/logos/whatsapp.jpg`
        }
      },
      roomsPagination: {
        search: null,
        page: 0,
        perPage: 20,
        total: 0
      },
    }
  },
  computed: {
    //Return accept files
    acceptFiles() {
      //Images
      if (this.accept == 'images') return '.jpg, image/*'
      //documents
      if (this.accept == 'documents') return '.pdf, .xlsx, .docx, .pptx'
      //Media
      if (this.accept == 'media') return '.mp4, .mp3, .jpg, image/*'

      //Default
      let mediaConfig = this.$store.state.qsiteApp.configs.Media
      return this.$clone(mediaConfig ? mediaConfig['allowed-types'] : this.accept)
    },
    //Chat props
    chatProps() {
      return {
        currentUserId: this.$store.state.quserAuth.userId,
        rooms: this.rooms,
        messages: this.messages,
        loadingMessages: this.loading.messages,
        showReactionEmojis: false,
        messagesLoaded: (this.chatPagination.page == this.chatPagination.lastPage) ? true : false,
        loadFirstRoom: false,
        singleRoom: true,//this.roomId ? true : false,
        roomId: this.openRoomId,
        showAddRoom: this.allowCreateChat,
        messageActions: [{name: 'replyMessage', title: 'Reply'}],
        acceptedFiles: this.acceptFiles,
        height: this.height,
        menuActions: [],
        userOptions: {minUsers: 1, currentUser: false},
        scrollDistance: 10,
        ...(this.advancedProps || {})
      }
    },
    //Rooms
    rooms() {
      let rooms = []//Response
      let conversations = this.$clone(this.conversations)
      //Sort conversations
      conversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))

      //Order room
      conversations.forEach(conversation => {
        //Instance the roomImage
        var roomImage = conversation.userConversation.mainImage
        if (Object.keys(this.providers).includes(conversation.entityType) && roomImage.includes("default.")) {
          roomImage = this.providers[conversation.entityType].image
        }

        //Instance roorm
        let room = {
          roomId: conversation.id,
          roomName: this.conversationExternalData(conversation).title,
          avatar: roomImage,
          unreadCount: conversation.unreadMessagesCount || false,
          messageActions: false,
          phone: conversation.entityType == "whatsapp" ? conversation.entityId : null,
          lastMessage: !conversation.lastMessage ? false : {
            content: conversation.lastMessage.body || '',
            senderId: conversation.lastMessage.userId,
            timestamp: this.$date.getHumanCalendar(conversation.updatedAt)
          },
          users: conversation.users.map(user => {
            return {
              _id: user.id,
              username: user.fullName,
              avatar: user.mainImage,
              status: {
                lastChanged: Object.keys(this.providers).includes(conversation.entityType) ? `(${conversation.entityType})` : false
              }
            }
          }),
        }
        //Push room
        rooms.push(room)
      })

      //Response
      return this.$clone(rooms)
    },
    //Messages
    messages() {
      let messages = []//Response
      let conversationMessages = this.$clone(this.conversationMessages).reverse()
      //Order room
      conversationMessages.forEach(messageData => {
        if (!messages.find(message => message._id == messageData.id)) {
          let conversation = this.conversations.find(item => item.id == messageData.conversationId)
          let rightMessage = !conversation ? false :
              (this.conversationExternalData(conversation).externalUsers.map(item => item.id).includes(messageData.user.id) ? false : true)
          //Validate reply message
          if (messageData.replyTo) {
            messageData.replyMessage = {
              _id: messageData.replyTo.id,
              content: messageData.replyTo.body || '',
              sender_id: messageData.replyTo.userId,
              file: !messageData.replyTo.attachment ? false : {
                name: messageData.replyTo.attachment.filename,
                size: messageData.replyTo.attachment.filesize,
                type: messageData.replyTo.attachment.mimetype,
                extension: `.${messageData.replyTo.attachment.extension}`,
                url: messageData.replyTo.attachment.path,
                audio: messageData.replyTo.attachment.extension == 'mp3' ? true : false
              }
            }
          }

          //Validate attachment message
          if (messageData.attachment) {
            messageData.file = {
              id: messageData.attached,
              name: messageData.attachment.filename,
              size: messageData.attachment.filesize,
              type: messageData.attachment.mimetype,
              extension: `.${messageData.attachment.extension}`,
              url: messageData.attachment.path,
              audio: messageData.attachment.extension == 'mp3' ? true : false
            }
          }

          if(messageData.status >= 5) {
            //Instance systemMessage
            let systemMessage = {
              _id: messageData.id + '_',
              content: messageData.statusName || '',
              date: this.$trd(messageData.createdAt),
              senderId: rightMessage ? this.$store.state.quserAuth.userId : messageData.user.id,
              system: true,
              frontId: messageData.frontId || false
            }

            //Push room
            messages.push(systemMessage)

          }

          // Defined text of status
          let statusText = '';
          if (messageData.status) {
            statusText = messageData.status < 5 ? messageData.statusName : 'No enviado';
          }

          //Instance message
          let message = {
            _id: messageData.id,
            content: messageData.body || '',
            senderId: rightMessage ? this.$store.state.quserAuth.userId : messageData.user.id,
            username: messageData.user.fullName,
            avatar: messageData.user.mainImage,
            date: this.$trd(messageData.createdAt),
            failure: messageData.status >= 5,
            timestamp: `${statusText} ${this.$trd(messageData.createdAt, {type: 'time'})}`,
            files: messageData.file ? (Array.isArray(messageData.file) ? messageData.file : [messageData.file]) : [],
            replyMessage: messageData.replyMessage || false,
            seen: messageData.status === 3,
            errorMessage: messageData.status >= 5 ?  messageData.statusName : '',
            frontId: messageData.frontId || false
          }

          //Push room
          messages.push(message)
        }
      })
      //Response
      return this.$clone(messages)
    },
    //Field to dynamic field, new rooms
    fieldsToNewRooms() {
      return {
        type: {
          value: 'user',
          type: 'select',
          props: {
            label: this.$tr('isite.cms.form.type'),
            vIf: this.allowProviders,
            options: [
              {label: this.$tr('isite.cms.label.user'), value: 'user'},
              {label: this.$tr('isite.cms.label.provider'), value: 'provider'}
            ]
          }
        },
        blocks: {
          user: [{
            fields: {
              userId: {
                value: null,
                type: 'select',
                required: true,
                props: {
                  label: this.$tr('isite.cms.label.user') + "*"
                },
                loadOptions: {
                  apiRoute: 'apiRoutes.quser.users',
                  select: {label: 'fullName', id: 'id'},
                  filterByQuery: true
                }
              }
            }
          }],
          provider: [{
            fields: {
              providerType: {
                value: null,
                type: 'select',
                required: true,
                props: {
                  label: this.$tr('isite.cms.label.provider') + "*",
                },
                loadOptions: {
                  delayed: () => {
                    return new Promise(resolve => {
                      //Request
                      this.$crud.index('apiRoutes.qnotification.providers', {refresh: true}).then(response => {
                        resolve(response.data.filter(prov => {
                          if (prov.data && parseInt(prov.data.status || "0") && parseInt(prov.data.fields?.canCreateConversation || "0"))
                            return prov
                        }).map(prov => ({label: prov.name, value: prov.systemName})))
                      }).catch(error => {
                        this.$apiResponse.handleError(error, () => {
                          resolve([])
                        })
                      })
                    })
                  }
                }
              },
              providerId: {
                value: null,
                type: 'input',
                required: true,
                props: {
                  label: this.$tr('isite.cms.label.contact') + "*"
                }
              },
              firstName: {
                value: null,
                type: 'input',
                props: {
                  label: this.$tr('isite.cms.form.firstName')
                }
              },
              lastName: {
                value: null,
                type: 'input',
                props: {
                  label: this.$tr('isite.cms.form.lastName')
                }
              }
            }
          }]
        }
      }
    },
    //Search field
    dynamicfields() {
      return {
        search: {
          type: 'search',
          props: {
            icon: null,
            clearable: false
          }
        }
      }
    }
  },
  methods: {
    init() {
      //Listen events
      this.listenEvents()
      this.getRooms()
    },
    //Listen pusher message
    listenEvents() {
      //New message from pusher
      this.$eventBus.$on('inotification.chat.message', (response) => {
        if (response.data) this.pushMessage(response.data)
      })
    },
    //Get auth user rooms
    getRooms(params = {}) {
      return new Promise((resolve, reject) => {
        if (this.loadRooms) {
          params = {index: 1, done: null, search: null, roomId: null, ...params}
          this.loading.rooms = true
          if (!this.rooms.map(item => item.roomId).includes(this.openRoomId)) this.openRoomId = null

          //Request Params
          let requestParams = {
            refresh: true,
            params: {
              include: 'users,lastMessage,conversationUsers',
              filter: {ids: this.$clone(this.roomsId)}
            }
          }

          //Request
          if (this.roomId) {//Get only one room
            this.$crud.show('apiRoutes.qchat.conversations', this.roomId, requestParams).then(response => {
              this.orderConversationData([response.data])
              this.openRoomId = this.conversations[0].id
              this.loading.rooms = false // stop load Rooms
              resolve(response.data)
            }).catch(error => {
              this.$apiResponse.handleError(error, () => {
                this.loading.rooms = false
                resolve(error)
              })
            })
          } else {//Get user auth rooms
            //Set pagination
            if (params.index == 1 || this.conversations.length < this.roomsPagination.total) {
              requestParams.params = {
                ...requestParams.params,
                page: params.search ? 1 : params.index,
                take: this.roomsPagination.perPage,
                filter: {
                  ...requestParams.params.filter,
                  search: this.roomsPagination.search
                },
              }

              //Request
              this.$crud.index('apiRoutes.qchat.conversations', requestParams).then(response => {
                this.orderConversationData(response.data, (response.meta.page.currentPage == 1 ? false : true))
                //Set chat pagination
                this.roomsPagination.total = response.meta.page.total
                this.roomsPagination.page = response.meta.page.currentPage
                this.loading.rooms = false
                resolve(response.data)
                if (params.done) params.done()
              }).catch(error => {
                this.$apiResponse.handleError(error, () => {
                  this.loading.rooms = false
                  resolve(error)
                  if (params.done) params.done()
                })
              })
            } else {
              this.$refs.infiniteScroll.stop()
            }
          }
        }
      })
    },
    //Order conversation Data (Transform)
    orderConversationData(conversations, mergeConversations = true) {
      //Transform data
      conversations.forEach(conversation => {
        //Set to first level conversation user
        conversation.userConversation = {
          ...conversation.conversationUsers.find(user => user.userId != this.$store.state.quserAuth.userId),
          ...conversation.users.find(user => user.id != this.$store.state.quserAuth.userId)
        }
        //Set to first level conversation auth user
        conversation.authUserConversation = {
          ...conversation.conversationUsers.find(user => user.userId == this.$store.state.quserAuth.userId),
          ...conversation.users.find(user => user.id == this.$store.state.quserAuth.userId)
        }
        //Set to first level unread messages count
        conversation.unreadMessagesCount = parseInt(conversation.authUserConversation.unreadMessagesCount)
      })

      if(mergeConversations){
        // Filter unique conversation by id
        conversations = this.$array.mergeUniqueBy([...this.conversations, ...conversations], 'id')
      }
      //Assign conversation data
      this.conversations = conversations
    },
    //Get messages
    getMessages({room, options}) {
      return new Promise((resolve, reject) => {
        this.loading.messages = true
        //Reset room data
        if (options && options.reset) {
          this.conversationMessages = []//Reset chat messages
          this.chatPagination.page = 0//Reset chat page
          this.chatPagination.lastPage = -1//Reset chat plast page
        }
        //Order room data after open
        this.openRoomId = room.roomId//Set open room id
        //Reset unread message to conversation
        let conversationIndex = this.conversations.findIndex(item => item.id == room.roomId)
        this.conversations[conversationIndex].unreadMessagesCount = false
        //Request params
        let requestParams = {
          refresh: true,
          params: {
            page: (this.chatPagination.page + 1),
            take: this.chatPagination.perPage,
            filter: {conversationId: room.roomId},
            include: 'user,replyTo'
          }
        }

        //Request
        this.$crud.index('apiRoutes.qchat.messages', requestParams).then(response => {
          //reset conversation messages
          if (options && options.reset) this.conversationMessages = []
          //Set messages
          this.conversationMessages = this.$clone([...this.conversationMessages, ...response.data])
          //Set chat pagination
          this.chatPagination.lastPage = response.meta.page.lastPage
          this.chatPagination.page = response.meta.page.currentPage
          //Hide loading
          this.loading.messages = false
          resolve(response.data)
        }).catch(error => {
          this.$apiResponse.handleError(error, () => {
            this.loading.messages = false
            resolve(error)
          })
        })
      })
    },
    //Send message
    sendMessage({content, roomId, files, replyMessage}) {
      return new Promise(async (resolve, reject) => {
        //Set file information to message
        if (files) {
          files.forEach((file, indexFile) => {
            //Instance the message
            let messageWithfile = {
              body: indexFile == (files.length - 1) ? content : "",
              frontId: this.$uid(),
              file: {
                name: file.name,
                size: file.size,
                type: file.extension || file.type,
                extension: `.${file.extension || file.type}`,
                url: file.url || file.localUrl,
                audio: file.audio ? true : false,
                duration: file.duration || 0
              }
            }
            //push Message
            this.pushMessage(messageWithfile)
            //Upload Message
            this.uploadMessage({
              ...messageWithfile,
              roomId,
              file: {...messageWithfile.file, blob: file.blob}
            })
          })
          //
        } else {
          //Instance the message
          let message = {
            body: content,
            frontId: this.$uid(),
            ...(replyMessage ? {replyMessage} : {})
          }
          //Push message
          this.pushMessage(message)
          //Upload message
          this.uploadMessage({...message, roomId})
        }
      })
    },
    /** Upload Message */
    uploadMessage(message) {
      return new Promise(async (resolve, reject) => {
        //Request data to conversation message
        let requestData = {
          frontId: message.frontId,
          conversationId: message.roomId,
          body: message.body || '',
          userId: this.$store.state.quserAuth.userId,
          replyToId: message.replyMessage ? message.replyMessage._id : null
        }

        //Save file from the previous message
        if(message.attached) {
          requestData.mediasSingle = {attachment: message.attached}
          requestData.attached = message.attached
        }

        //Upload file to media
        if (message.file) {
          let {file} = message
          //Parse file
          let fileBase64 = await this.$helper.getBase64(file.blob)
          let fileObject = await this.$helper.urlToFile(
              fileBase64,
              file.audio ? file.name : `${file.name}.${file.extension}`,
              file.type
          )

          //Form Data
          let fileData = new FormData()
          fileData.append('parent_id', 0)
          fileData.append('file', fileObject)
          fileData.append('disk', 'privatemedia')

          //Request send file
          let fileMedia = await this.$crud.post('apiRoutes.qmedia.files', fileData)

          //Add file id to message
          if (fileMedia && fileMedia.data) {
            requestData.mediasSingle = {attachment: fileMedia.data.id}
            requestData.attached = fileMedia.data.id
          }
        }

        //Request
        this.$crud.create('apiRoutes.qchat.messages', requestData).then(response => {
          //Search message by frontId
          let messageIndex = this.conversationMessages.findIndex(item => item.frontId == response.data.frontId)
          //Set db message id to local message
          if (messageIndex != -1) {
            this.conversationMessages[messageIndex].id = response.data.id
            this.conversationMessages[messageIndex].attachment = response.data.attachment || false
          }
          resolve(response)
        }).catch(error => reject(error))
      })
    },
    //Push new message
    pushMessage(message) {
      //Get current conversation ID
      let conversationId = message.conversation ? message.conversation.id : this.openRoomId
      //Get current conversation Index
      let conversationIndex = conversationId ? this.conversations.findIndex(item => item.id == conversationId) : false
      //Get current conversation
      let conversation = (conversationIndex >= 0) ? this.conversations[conversationIndex] : false

      //Message object data
      let messageData = {
        id: this.$uid(),
        user: (message.userId && conversation) ?
            conversation.users.find(user => user.id == message.userId) : this.$store.state.quserAuth.userData,
        createdAt: this.$moment().format('YYYY-MM-DD HH:mm:ss'),
        updatedAt: this.$moment().format('YYYY-MM-DD HH:mm:ss'),
        ...message
      }

      //Add conversation if not exist
      if (!conversation && message.conversation) {
        this.orderConversationData([...this.conversations, {
          ...message.conversation,
          lastMessage: messageData
        }])
      }

      //Update conversation data
      if (conversation) {
        //Update last update date
        this.conversations[conversationIndex].updatedAt = this.$moment().format('YYYY-MM-DD HH:mm:ss')
        //Update last message
        this.conversations[conversationIndex].lastMessage = messageData
        //Add unread message counter
        if (message.conversation && (message.conversation.id != this.openRoomId)) {
          this.conversations[conversationIndex].unreadMessagesCount += 1
        }
      }

      //Set local message
      if (!message.conversation || (message.conversation.id == this.openRoomId)) {
        this.conversationMessages.unshift(messageData)
      }

      //Play sound
      this.playSound(message)
    },
    //Play sound message
    playSound(message) {
      //If room is close
      if (message.conversation && (message.conversation.id != this.openRoomId)) {
        this.$helper.playSound({
          url: `${this.$store.state.qsiteApp.baseUrl}/modules/ichat/audio/sound_chat_notification.mp3`
        })
      } else if (message.userId && (message.userId != this.$store.state.quserAuth.userId)) {
        this.$helper.playSound({
          url: `${this.$store.state.qsiteApp.baseUrl}/modules/ichat/audio/sound_message_notification.mp3`,
          volume: 0.2
        })
      }
    },
    //Create conversation
    createRoom() {
      return new Promise((resolve, reject) => {
        let apiRoute = null
        let requestParams = null

        //validate user selected is not same to auth user
        if (this.newRoom.type == "user" && this.newRoom.form.userId) {
          //Get userId
          const userId = this.newRoom.form.userId

          if (userId == this.chatProps.currentUserId) {
            this.modalNewRoom.loading = false
            this.$alert.error(this.$tr('isite.cms.message.errorRequest'))
            return reject(false)
          }

          //Validate if conversation already exist
          let existConversation = this.conversations.find(conversation => {
            return conversation.users.find(user => user.id == userId) ? conversation : false
          })

          //Open conversation
          if (existConversation) {
            this.modalNewRoom = {show: false, loading: false}
            this.openRoomId = existConversation.id
            return resolve(existConversation)
          }

          //Request Params
          apiRoute = 'apiRoutes.qchat.conversations'
          requestParams = {users: [userId, this.chatProps.currentUserId]}
        } else {
          apiRoute = 'apiRoutes.qchat.providerConversations'
          requestParams = {
            provider: this.newRoom.form.providerType,
            conversationId: this.newRoom.form.providerId,
            firstName: this.newRoom.form.firstName,
            lastName: this.newRoom.form.lastName
          }
        }

        if (apiRoute && requestParams) {
          this.modalNewRoom.loading = true
          //Request to Create conversation
          this.$crud.create(apiRoute, requestParams).then(async response => {
            await this.getRooms(true)
            this.openRoomId = response.data.id || response.data.conversation?.id
            this.newRoom.form = {
              userId: null,
              providerType: null,
              providerId: null,
              firstName: null,
              lastName: null
            }
            this.modalNewRoom = {show: false, loading: false}
            resolve(response.data)
          }).catch(error => {
            this.modalNewRoom = {show: false, loading: false}
            reject(error)
          })
        }
      })
    },
    //Menu action handler
    menuActionHandler({roomId, action}) {
      if (action.action) action.action({roomId, action})
    },
    //Handle search
    async handleSearch(val) {
      this.$refs.listRoomsContent.scrollTop = 0;
      this.$refs.infiniteScroll.reset();
      this.$refs.infiniteScroll.resume();
      this.conversations = []
      await this.getRooms({search: val})
      this.$refs.infiniteScroll.setIndex(1)
    },
    //Return the conversationTitle
    conversationExternalData(conversation) {
      let externalRoles = this.$store.getters['qsiteApp/getSettingValueByName']('ichat::externalRoles') ?? []
      let siteName = this.$store.getters['qsiteApp/getSettingValueByName']('core::site-name')
      let userId = this.$store.state.quserAuth.userId
      //Group the users
      let externalUsers = conversation.users.filter(user => {
        let userRoles = user.roles.map(item => item.id)
        return this.$array.hasCommonElement(userRoles, externalRoles) || !userRoles.length
      })
      //Response
      return {
        title: externalUsers.map(user => user.id).includes(userId) ? siteName :
            externalUsers.map(user => user.fullName).join(', '),
        externalUsers
      }

    },
    showError({roomId, message}) {
      this.$alert.warning({
        mode: 'modal',
        title: this.$trp('ichat.cms.message.couldNotSend'),
        message: `<div>${this.$tr('isite.cms.label.error')}: ${message.errorMessage}</div>`,
        actions: [
          {label: this.$tr('isite.cms.label.close'), color: 'grey-5'},
          {
            label: this.$tr('ichat.cms.label.resend'),
            color: 'primary',
            handler: () => {
              const messageParsed = {
                ...message,
                roomId: roomId,
                body: message.content,
                attached: message.files[0]?.id
              }

              // Delete failed Message
              this.conversationMessages = this.conversationMessages.filter(item => item.id !== message._id);
              // Push resend Message
              this.pushMessage(messageParsed)

              this.uploadMessage(messageParsed).then(response => {
                this.$crud.delete('apiRoutes.qchat.messages', message._id)
              })
            }
          }
        ]
      });
    },
  }
}
</script>
<style lang="stylus">
#advanceChatComponentContent
  #vueAdvanceChat
    &.vac-card-window
      box-shadow none

    .vac-room-list
      .vac-room-item
        min-height auto
        padding 8px 10px 8px 8px

        .vac-avatar
          margin-right 8px

        .vac-badge-counter
          height 17px
          width 17px
          font-size 10px
          background-color $blue

</style>
