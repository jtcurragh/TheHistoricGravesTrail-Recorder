const USER_SETUP_COMPLETE_KEY = 'userSetupComplete'

export function isUserSetupComplete(): boolean {
  return localStorage.getItem(USER_SETUP_COMPLETE_KEY) === 'true'
}

export function setUserSetupComplete(): void {
  localStorage.setItem(USER_SETUP_COMPLETE_KEY, 'true')
}
