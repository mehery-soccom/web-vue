<script setup>
// import { useAppAbility } from "@app-lead/plugins/casl/useAppAbility";
import { PerfectScrollbar } from "vue3-perfect-scrollbar";

const router = useRouter();
// const ability = useAppAbility();
const userData = JSON.parse(localStorage.getItem("userData") || "null");

const logout = async () => {
  try {
    window.location.href = `${window.location.origin}/nexus/insights360/auth/logout`;
  } catch (e) {
    console.error("Logout not successful", e);
  }
};

const userProfileList = [
  { type: "divider" },
  {
    type: "navItem",
    icon: "tabler-logout",
    title: "Logout",
    onClick: logout,
  },
];
</script>

<template>
  <VBadge
    dot
    bordered
    location="bottom right"
    offset-x="3"
    offset-y="3"
    color="success"
  >
    <VAvatar
      class="cursor-pointer"
      :color="!(userData && userData.avatar) ? 'primary' : undefined"
      :variant="!(userData && userData.avatar) ? 'tonal' : undefined"
    >
      <VImg v-if="userData && userData.avatar" :src="userData.avatar" />
      <VIcon v-else icon="tabler-user" />

      <!-- SECTION Menu -->
      <VMenu activator="parent" width="230" location="bottom end" offset="14px">
        <VList>
          <VListItem>
            <template #prepend>
              <VListItemAction start>
                <VBadge
                  dot
                  location="bottom right"
                  offset-x="3"
                  offset-y="3"
                  color="success"
                  bordered
                >
                  <VAvatar
                    :color="
                      !(userData && userData.avatar) ? 'primary' : undefined
                    "
                    :variant="
                      !(userData && userData.avatar) ? 'tonal' : undefined
                    "
                  >
                    <VImg
                      v-if="userData && userData.avatar"
                      :src="userData.avatar"
                    />
                    <VIcon v-else icon="tabler-user" />
                  </VAvatar>
                </VBadge>
              </VListItemAction>
            </template>

            <VListItemTitle
              class="font-weight-medium"
              v-if="userData && userData.fullName"
            >
              {{ userData.fullName || userData.username }}
            </VListItemTitle>
            <VListItemSubtitle v-if="userData && userData.role">{{
              userData.role
            }}</VListItemSubtitle>
          </VListItem>

          <PerfectScrollbar :options="{ wheelPropagation: false }">
            <template v-for="item in userProfileList" :key="item.title">
              <VListItem
                v-if="item.type === 'navItem'"
                :to="item.to"
                @click="item.onClick && item.onClick()"
              >
                <template #prepend>
                  <VIcon class="me-2" :icon="item.icon" size="22" />
                </template>

                <VListItemTitle>{{ item.title }}</VListItemTitle>

                <template v-if="item.badgeProps" #append>
                  <VBadge v-bind="item.badgeProps" />
                </template>
              </VListItem>

              <VDivider v-else class="my-2" />
            </template>
          </PerfectScrollbar>
        </VList>
      </VMenu>
      <!-- !SECTION -->
    </VAvatar>
  </VBadge>
</template>
