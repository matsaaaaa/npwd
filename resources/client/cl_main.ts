import { sendMessage } from '../utils/messages';
import { PhoneEvents } from '../../typings/phone';
import { TwitterEvents } from '../../typings/twitter';
import { MessageEvents } from '../../typings/messages';
import { config } from './client';
import { animationService } from './animations/animation.controller';
import { RegisterNuiCB } from './cl_utils';

let isPhoneOpen = false;

const exps = global.exports;

/* * * * * * * * * * * * *
 *
 *  Phone initialize data
 *
 * * * * * * * * * * * * */
function fetchOnInitialize() {
  emitNet(MessageEvents.FETCH_MESSAGE_GROUPS);
  emitNet(TwitterEvents.GET_OR_CREATE_PROFILE);
  sendMessage('PHONE', PhoneEvents.SET_CONFIG, config);
}

onNet(PhoneEvents.ON_INIT, () => {
  fetchOnInitialize();
});

RegisterKeyMapping('phone', 'Open Phone', 'keyboard', 'f1');

const getCurrentGameTime = () => {
  let hour: string | number = GetClockHours();

  let minute: string | number = GetClockMinutes();

  // Format time if need be
  if (hour < 10) hour = `0${hour}`;
  if (minute < 10) minute = `0${minute}`;

  return `${hour}:${minute}`;
};

/* * * * * * * * * * * * *
 *
 *  Phone Visibility Handling
 *
 * * * * * * * * * * * * */

const showPhone = async (): Promise<void> => {
  isPhoneOpen = true;
  const time = getCurrentGameTime();
  await animationService.openPhone(); // Animation starts before the phone is open
  emitNet('phone:getCredentials');
  SetCursorLocation(0.9, 0.922); //Experimental
  sendMessage('PHONE', PhoneEvents.SET_VISIBILITY, true);
  sendMessage('PHONE', PhoneEvents.SET_TIME, time);
  SetNuiFocus(true, true);
  SetNuiFocusKeepInput(true);
  emit('npwd:disableControlActions', true);
};

const hidePhone = async (): Promise<void> => {
  isPhoneOpen = false;
  sendMessage('PHONE', PhoneEvents.SET_VISIBILITY, false);
  await animationService.closePhone();
  SetNuiFocus(false, false);
  SetNuiFocusKeepInput(false);
  emit('npwd:disableControlActions', false);
};

/* * * * * * * * * * * * *
 *
 *  Register Command and Keybinding
 *
 * * * * * * * * * * * * */
RegisterCommand(
  'phone',
  async () => {
    //-- Toggles Phone
    await togglePhone();
  },
  false,
);

RegisterCommand(
  'phone:restart',
  async () => {
    await hidePhone();
    sendMessage('PHONE', 'phoneRestart', {});
    fetchOnInitialize();
  },
  false,
);

/* * * * * * * * * * * * *
 *
 *  Misc. Helper Functions
 *
 * * * * * * * * * * * * */

const checkExportCanOpen = (): boolean => {
  const exportResp = exps[config.PhoneAsItem.exportResource][config.PhoneAsItem.exportFunction]();
  if (typeof exportResp !== 'number' && typeof exportResp !== 'boolean') {
    throw new Error('You must return either a boolean or number from your export function');
  }

  return !!exportResp;
};

async function togglePhone(): Promise<void> {
  if (config.PhoneAsItem.enabled) {
    const canAccess = checkExportCanOpen();
    if (!canAccess) return;
  }
  if (isPhoneOpen) return await hidePhone();
  await showPhone();
}

onNet(PhoneEvents.SEND_CREDENTIALS, (number: string) => {
  sendMessage('SIMCARD', PhoneEvents.SET_NUMBER, number);
});

on('onResourceStop', (resource: string) => {
  if (resource === GetCurrentResourceName()) {
    sendMessage('PHONE', PhoneEvents.SET_VISIBILITY, false);
    SetNuiFocus(false, false);
    animationService.endPhoneCall();
    animationService.closePhone();
    ClearPedTasks(PlayerPedId()); //Leave here until launch as it'll fix any stuck animations.
  }
});

// DO NOT CHANGE THIS EITHER, PLEASE - CHIP
// ^ AND WHAT ARE YOU GOING TO DO HUH? - KIDZ

/* * * * * * * * * * * * *
 *
 *  NUI Service Callback Registration
 *
 * * * * * * * * * * * * */
RegisterNuiCB<void>(PhoneEvents.CLOSE_PHONE, async (_, cb) => {
  await hidePhone();
  cb();
});

// NOTE: This probably has an edge case when phone is closed for some reason
// and we need to toggle keep input off
RegisterNuiCB<{ keepGameFocus: boolean }>(
  PhoneEvents.TOGGLE_KEYS,
  async ({ keepGameFocus }, cb) => {
    // We will only
    if (isPhoneOpen) SetNuiFocusKeepInput(keepGameFocus);
    cb({});
  },
);

// setTick(async () => {
//   while (config.SwimDestroy) {
//     await Delay(config.RunRate * 1000);
//     if (IsPedSwimming(PlayerPedId())) {
//       let chance = Math.floor(Math.random() * 100 + 1);
//       if (chance <= config.DestoryChance) {
//         countPhone((countPhone: boolean) => {
//           if (countPhone) {
//             ESX.ShowNotification("Your phone is ruined from the water!");
//             destroyedPhone = true;
//           }
//         });
//       }
//       if (destroyedPhone) {
//         await Delay(config.DestroyPhoneReCheck * 60000);
//       }
//     }
//   }
// });

// Will update the phone's time even while its open
// setInterval(() => {
//   const time = getCurrentGameTime()
//   sendMessage('PHONE', 'setTime', time)
// }, 2000);
