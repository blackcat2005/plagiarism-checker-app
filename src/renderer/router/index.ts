import { createRouter, createWebHistory } from 'vue-router'
import { ROUTES } from '@/shared/constants/app.constants'
import MainLayout from '@/renderer/components/layout/MainLayout.vue'
import LoginView from '@/renderer/views/LoginView.vue'
import CheckView from '@/renderer/views/check-view/CheckView.vue'
import { useAuthStore } from '@/renderer/state-stores/auth.store'
import SubmissionListView from '@/renderer/views/SubmissionListView.vue'
import SingleCheckView from '@/renderer/views/check-view/single-view/SingleCheckView.vue'
import MultipleCheckView from '@/renderer/views/check-view/multiple-view/MultipleCheckView.vue'
import MultipleCheckResultDetailView from '@/renderer/views/check-view/multiple-view/MultipleCheckResultDetailView.vue'
import ResultPdfView from '@/renderer/views/result/ResultPdfView.vue'

const routes = [
  {
    path: '',
    component: MainLayout,
    children: [
      {
        path: ROUTES.LOGIN,
        component: LoginView,
        meta: { requiresAuth: false }
      },
      {
        path: ROUTES.CHECK,
        component: CheckView,
        meta: { requiresAuth: true }
      },
      {
        path: ROUTES.LIST_SUBMISSION,
        component: SubmissionListView,
        meta: { requiresAuth: true }
      },
      {
        path: ROUTES.CHECK_SINGLE,
        component: SingleCheckView,
        meta: { requiresAuth: true }
      },
      {
        path: ROUTES.CHECK_MULTIPLE,
        component: MultipleCheckView,
        meta: { requiresAuth: true }
      },
      {
        path: `${ROUTES.CHECK_MULTIPLE_RESULT}/:id`,
        component: MultipleCheckResultDetailView,
        meta: { requiresAuth: true }
      },
      {
        path: ROUTES.CHECK_RESULT_PDF_VIEW,
        component: ResultPdfView,
        meta: { requiresAuth: true }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Route guard
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)

  if (requiresAuth && !authStore.isAuthenticated) {
    // Nếu route yêu cầu đăng nhập nhưng chưa đăng nhập
    next({ path: ROUTES.LOGIN })
  } else if (to.path === ROUTES.LOGIN && authStore.isAuthenticated) {
    // Nếu đã đăng nhập và cố truy cập trang đăng nhập
    next({ path: ROUTES.CHECK })
  } else {
    next()
  }
})

export default router
