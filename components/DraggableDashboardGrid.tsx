import { ReactNode, useEffect, useState } from "react";
import { Dimensions, LayoutChangeEvent, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  runOnJS,
  SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

/**
 * Drag-and-drop dashboard grid — smooth version.
 *
 * Design goals (the v1 of this component had a cluttered, jumpy feel
 * because every pan frame did setState on the JS thread, triggering
 * full React re-renders mid-drag):
 *
 *  - **All hot-path math lives in worklets.** No JS-bridge crossings
 *    during a drag. The only JS-side events that fire are:
 *      • drag start (sets isDragging state for visual emphasis)
 *      • drag end  (commits the new order via onReorder)
 *    Between those, position updates, hit-testing, and slot swaps all
 *    happen on the UI thread via shared values.
 *
 *  - **Per-cell shared values for slot position.** Each cell owns its
 *    own slotX/slotY shared values. When the order changes (due to a
 *    swap during drag), the SLOT position of every affected cell is
 *    updated via withSpring — so non-dragged neighbours glide smoothly
 *    into their new homes instead of teleporting.
 *
 *  - **Shared array as source of truth for order.** `orderShared` is a
 *    `useSharedValue<T[]>` that worklets mutate during a drag. Cells
 *    subscribe via `useAnimatedReaction` to recompute their slot when
 *    their own index changes in the array.
 *
 *  - **The dragged cell snaps slot position instantly** (not springs)
 *    so its visible position stays under the finger. The pan handler
 *    subtracts the slot-delta from its drag offset (tx/ty) on every
 *    swap to keep the visible position continuous.
 *
 *  - **Absolute positioning inside a fixed-height parent.** Avoids the
 *    flex-wrap layout reflowing during drag, which is what caused the
 *    "cluttering" symptom — flex-wrap recomputes the whole row layout
 *    on every change. With absolute positions there's no layout
 *    invalidation; cells just slide.
 *
 * API stays the same as v1: `items`, `renderItem(key, isDragging)`,
 * `onReorder(next)`.
 */

const COLS = 2;
const PADDING = 6; // visual padding around each cell, must match inner card style

type GridProps<T extends string> = {
  items: T[];
  renderItem: (key: T, isDragging: boolean) => ReactNode;
  onReorder: (next: T[]) => void;
};

export function DraggableDashboardGrid<T extends string>({
  items,
  renderItem,
  onReorder,
}: GridProps<T>) {
  // Source-of-truth ordering. Worklets read/write this; the React
  // state is only synced on drop, so mid-drag we don't trigger
  // re-renders for swaps.
  const orderShared = useSharedValue<T[]>(items);

  // Sync if items change externally (e.g., user toggles a card in the
  // hide/show screen). Skip during a drag to avoid stomping the
  // in-progress reorder.
  const [draggingKey, setDraggingKey] = useState<T | null>(null);
  useEffect(() => {
    if (draggingKey === null) {
      orderShared.value = items;
    }
    // shared values stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, draggingKey]);

  // Single measured card size, shared across all cells. Initialised with
  // sensible defaults derived from screen width so the very-first render
  // already has cells in the right slots (avoids the visible "stacked at
  // 0,0 then snap into place" flash that happened with cardW starting at
  // zero). onMeasure refines these on first layout pass.
  const screenW = Dimensions.get("window").width;
  // Dashboard's outer ScrollView padding is 16 each side (p-4). Subtract
  // it so the cells fit within their column width.
  const initialSlotW = Math.floor((screenW - 32) / COLS);
  const initialSlotH = 140; // approximate; refined via onMeasure
  const cardW = useSharedValue(initialSlotW);
  const cardH = useSharedValue(initialSlotH);
  const [measuredHeight, setMeasuredHeight] = useState(initialSlotH);

  // Parent container height = rows × cardH so cells (which are absolutely
  // positioned) actually take up vertical space and the page scrolls.
  const rows = Math.ceil(items.length / COLS);
  const containerHeight = rows * measuredHeight + PADDING * 2;

  return (
    <>
      <DragHint visible={draggingKey === null} />
      <View
        // Outer container has a definite height so cells inside (absolute
        // position) lay out correctly and the rest of the page sits below.
        style={{ height: containerHeight, marginHorizontal: -PADDING }}
      >
        {items.map((key) => (
          <DraggableCell
            key={key}
            itemKey={key}
            orderShared={orderShared}
            cardW={cardW}
            cardH={cardH}
            isDragging={draggingKey === key}
            onLiftStart={() => setDraggingKey(key)}
            onDragEnd={() => {
              const next = orderShared.value.slice();
              setDraggingKey(null);
              onReorder(next);
            }}
            onMeasure={(w, h) => {
              cardW.value = w;
              cardH.value = h;
              setMeasuredHeight(h);
            }}
          >
            {renderItem(key, draggingKey === key)}
          </DraggableCell>
        ))}
      </View>
    </>
  );
}

function DraggableCell<T extends string>({
  itemKey,
  orderShared,
  cardW,
  cardH,
  isDragging,
  onLiftStart,
  onDragEnd,
  onMeasure,
  children,
}: {
  itemKey: T;
  orderShared: SharedValue<T[]>;
  cardW: SharedValue<number>;
  cardH: SharedValue<number>;
  isDragging: boolean;
  onLiftStart: () => void;
  onDragEnd: () => void;
  onMeasure: (w: number, h: number) => void;
  children: ReactNode;
}) {
  // The slot position this cell wants to be at, derived from its index
  // in the shared order array. Springs smoothly during reorder.
  const slotX = useSharedValue(0);
  const slotY = useSharedValue(0);
  // Drag offset relative to the slot — nonzero only during a pan.
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  // Visual emphasis while lifted.
  const scale = useSharedValue(1);
  const shadow = useSharedValue(0);

  // Whenever this cell's index in the shared order changes (or the
  // measured card size changes), re-compute its slot. Snap on the first
  // measurement AND while this cell is the lifted one (so the finger
  // stays glued to it); spring otherwise.
  useAnimatedReaction(
    () => ({
      idx: orderShared.value.indexOf(itemKey),
      w: cardW.value,
      h: cardH.value,
    }),
    (state, prev) => {
      "worklet";
      if (state.idx < 0 || state.w <= 0) return;
      const col = state.idx % COLS;
      const row = Math.floor(state.idx / COLS);
      const targetX = col * state.w;
      const targetY = row * state.h;
      const isFirst = !prev || prev.w === 0;
      const lifted = scale.value > 1.0001;
      if (isFirst || lifted) {
        // Snap — no animation. For the lifted cell the pan handler is
        // already compensating tx/ty to keep visible position fixed.
        slotX.value = targetX;
        slotY.value = targetY;
      } else {
        slotX.value = withSpring(targetX, { damping: 22, stiffness: 240, mass: 0.55 });
        slotY.value = withSpring(targetY, { damping: 22, stiffness: 240, mass: 0.55 });
      }
    },
    [itemKey],
  );

  // Final composed style: position + drag offset + scale + shadow.
  const animatedStyle = useAnimatedStyle(() => {
    return {
      position: "absolute",
      left: PADDING,
      top: PADDING,
      width: cardW.value > 0 ? cardW.value - PADDING * 2 : undefined,
      transform: [
        { translateX: slotX.value + tx.value },
        { translateY: slotY.value + ty.value },
        { scale: scale.value },
      ],
      zIndex: scale.value > 1.0001 ? 100 : 1,
      shadowColor: "#0F172A",
      shadowOpacity: shadow.value,
      shadowRadius: 16 * shadow.value,
      shadowOffset: { width: 0, height: 8 * shadow.value },
      elevation: shadow.value > 0 ? 12 : 0,
    };
  });

  // Long-press to lift. minDuration matches Apple/Material's "tap-and-hold"
  // threshold (~250-300ms) so a normal tap never accidentally lifts a card.
  const longPress = Gesture.LongPress()
    .minDuration(250)
    .maxDistance(20)
    .onStart(() => {
      "worklet";
      cancelAnimation(scale);
      scale.value = withSpring(1.06, { damping: 14, stiffness: 280, mass: 0.4 });
      shadow.value = withTiming(0.22, { duration: 120 });
      runOnJS(onLiftStart)();
    });

  // Pan with hit-testing inline in the worklet — zero JS-bridge crossings
  // during a drag, so the cell follows the finger at native 60fps without
  // jitter.
  const pan = Gesture.Pan()
    .activateAfterLongPress(250)
    .onUpdate((e) => {
      "worklet";
      tx.value = e.translationX;
      ty.value = e.translationY;

      // Figure out which slot the dragged centre is currently over.
      if (cardW.value <= 0) return;
      const order = orderShared.value;
      const myIdx = order.indexOf(itemKey);
      if (myIdx < 0) return;
      const myCol = myIdx % COLS;
      const myRow = Math.floor(myIdx / COLS);
      // Centre = (my slot's centre) + drag offset
      const centreX = myCol * cardW.value + cardW.value / 2 + tx.value;
      const centreY = myRow * cardH.value + cardH.value / 2 + ty.value;
      const hoverCol = Math.floor(centreX / cardW.value);
      const hoverRow = Math.floor(centreY / cardH.value);
      // Clamp + reject out-of-grid hits so dragging far off-screen doesn't
      // try to swap with an undefined slot.
      if (hoverCol < 0 || hoverCol >= COLS) return;
      if (hoverRow < 0) return;
      const hoverIdx = hoverRow * COLS + hoverCol;
      if (hoverIdx >= order.length) return;
      if (hoverIdx === myIdx) return;

      // Splice + commit to the shared array. useAnimatedReaction on the
      // OTHER cells will fire and spring their slots to the new positions
      // — that's the smooth reflow the user sees.
      const next = order.slice();
      const [removed] = next.splice(myIdx, 1);
      next.splice(hoverIdx, 0, removed);
      orderShared.value = next;

      // Compensate my drag offset so the visible position is unchanged
      // even though my underlying slot just snapped to the new index.
      // Without this the dragged cell would visually "jump" by one slot
      // on every swap.
      const newCol = hoverIdx % COLS;
      const newRow = Math.floor(hoverIdx / COLS);
      tx.value -= (newCol - myCol) * cardW.value;
      ty.value -= (newRow - myRow) * cardH.value;
    })
    .onEnd(() => {
      "worklet";
      tx.value = withSpring(0, { damping: 18, stiffness: 240 });
      ty.value = withSpring(0, { damping: 18, stiffness: 240 });
      scale.value = withSpring(1, { damping: 18, stiffness: 240 });
      shadow.value = withTiming(0, { duration: 160 });
      runOnJS(onDragEnd)();
    })
    .onFinalize((_e, success) => {
      "worklet";
      // Safety net — if a cancellation comes through that didn't hit onEnd,
      // still reset visual state.
      if (!success) {
        tx.value = withSpring(0);
        ty.value = withSpring(0);
        scale.value = withSpring(1);
        shadow.value = withTiming(0, { duration: 160 });
      }
    });

  const composed = Gesture.Simultaneous(longPress, pan);

  return (
    <Animated.View
      style={animatedStyle}
      // Refine cardW/H on first layout — the screen-width default is a
      // good guess but actual cell height depends on content. Propagates
      // up via the parent's onMeasure callback so every cell shares the
      // same reference dimensions.
      onLayout={(e: LayoutChangeEvent) => {
        const { height } = e.nativeEvent.layout;
        // We trust the screen-width-derived slot width; just refine
        // height from the first cell that lays out.
        if (height > 0 && Math.abs(height + PADDING * 2 - cardH.value) > 4) {
          onMeasure(cardW.value, height + PADDING * 2);
        }
      }}
    >
      <GestureDetector gesture={composed}>
        <View>{children}</View>
      </GestureDetector>
    </Animated.View>
  );
}

/** One-line affordance hint above the grid. Stays visible whenever
 *  nothing is being dragged — subtle enough that experienced users tune
 *  it out, visible enough that new users learn the gesture. */
function DragHint({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: "#F1F5F9",
        marginBottom: 10,
        marginLeft: 6,
      }}
    >
      <Ionicons name="move-outline" size={13} color="#64748B" />
      <Text style={{ fontSize: 11, color: "#64748B", marginLeft: 4 }}>
        Long-press a tile to rearrange
      </Text>
    </View>
  );
}

/** Drop-in wrapper for chip TouchableOpacity callers — suppresses onPress
 *  while the chip is mid-drag (otherwise releasing the finger fires both
 *  drag-end and onPress, accidentally navigating). */
import { TouchableOpacity } from "react-native";
export function ChipPressable({
  isDragging,
  onPress,
  children,
}: {
  isDragging: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <TouchableOpacity
      onPress={isDragging ? undefined : onPress}
      activeOpacity={isDragging ? 1 : 0.6}
    >
      {children}
    </TouchableOpacity>
  );
}
