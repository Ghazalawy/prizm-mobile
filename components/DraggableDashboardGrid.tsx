import { ReactNode, useCallback, useRef, useState, useEffect } from "react";
import {
  LayoutChangeEvent,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

/**
 * Real drag-and-drop for the dashboard chips.
 *
 * Long-press (~280ms) on a chip to "lift" it — scale up, elevated
 * shadow. Continue with the same finger to drag it around. While
 * dragging, we hit-test the finger position against each chip's
 * pre-measured bounds; when the dragged chip's center crosses another
 * chip's bounds, we splice the order so the rest of the grid reflows.
 * The dragged chip's translateX/Y is rebased against its NEW slot in
 * the same tick so it visually stays under the finger.
 *
 * On release, the chip springs to translate (0,0) — which is now its
 * new home — and we commit the order via `onReorder`.
 *
 * Why hand-rolled: no need for a third-party draggable list (saves a
 * native dep + a build), and gesture-handler + reanimated are already
 * in the bundle. The grid is small (≤5 chips), so the bespoke version
 * is plenty fast.
 */

type Bounds = { x: number; y: number; w: number; h: number };

type GridProps<T extends string> = {
  items: T[];
  /** Render one chip. `isDragging` lets you slightly emphasise it. */
  renderItem: (key: T, isDragging: boolean) => ReactNode;
  /** Called after a drop with the new full order. Persist outside. */
  onReorder: (next: T[]) => void;
};

export function DraggableDashboardGrid<T extends string>({
  items,
  renderItem,
  onReorder,
}: GridProps<T>) {
  // Bounds of each chip's wrapper, keyed by item. Captured via onLayout.
  const boundsRef = useRef<Map<T, Bounds>>(new Map());
  const [draggingKey, setDraggingKey] = useState<T | null>(null);
  // Working order during a drag — committed to props on release.
  const [workingOrder, setWorkingOrder] = useState<T[] | null>(null);
  const orderRef = useRef<T[]>(items);
  orderRef.current = workingOrder ?? items;

  // Shared animated values for whichever chip is currently lifted. Only
  // one chip can be dragged at a time, so we use a single set of shared
  // values at the parent level instead of one per chip. The lifted chip
  // reads from these; non-lifted chips read flat zeros.
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);

  const handleLayout = useCallback(
    (key: T) => (e: LayoutChangeEvent) => {
      const { x, y, width, height } = e.nativeEvent.layout;
      boundsRef.current.set(key, { x, y, w: width, h: height });
    },
    []
  );

  /** When the dragged chip crosses into another slot mid-drag, splice
   *  the order so the layout reflows. Also rebase translate so the chip
   *  visually stays under the finger. */
  const reorderInPlace = useCallback(
    (draggedKey: T, fromIdx: number, toIdx: number) => {
      if (fromIdx === toIdx) return;
      const order = orderRef.current.slice();
      const [removed] = order.splice(fromIdx, 1);
      order.splice(toIdx, 0, removed);
      // Approximate the slot delta using the dragged chip's wrapper
      // bounds (we don't have post-reorder bounds yet). Two columns per
      // row; height per slot ≈ measured wrapper height.
      const sample = boundsRef.current.get(draggedKey);
      if (sample) {
        const colsPerRow = 2;
        const dx = ((toIdx % colsPerRow) - (fromIdx % colsPerRow)) * sample.w;
        const dy =
          (Math.floor(toIdx / colsPerRow) - Math.floor(fromIdx / colsPerRow)) *
          sample.h;
        tx.value = tx.value - dx;
        ty.value = ty.value - dy;
      }
      setWorkingOrder(order);
    },
    // shared values are stable refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const finishDrag = useCallback(
    (commit: boolean) => {
      if (commit) onReorder(orderRef.current.slice());
      setWorkingOrder(null);
      setDraggingKey(null);
    },
    [onReorder]
  );

  // Hit-test runs on the JS thread (per-pan-event). The cost is minor
  // for a 5-chip grid; if we ever scale this past ~30 chips we'd push
  // it onto the worklet thread.
  const hitTest = useCallback(
    (draggedKey: T) => {
      const dragBounds = boundsRef.current.get(draggedKey);
      if (!dragBounds) return;
      const centerX = dragBounds.x + dragBounds.w / 2 + tx.value;
      const centerY = dragBounds.y + dragBounds.h / 2 + ty.value;
      let hovered: T | null = null;
      for (const [k, b] of boundsRef.current.entries()) {
        if (k === draggedKey) continue;
        if (
          centerX >= b.x &&
          centerX <= b.x + b.w &&
          centerY >= b.y &&
          centerY <= b.y + b.h
        ) {
          hovered = k;
          break;
        }
      }
      if (!hovered) return;
      const order = orderRef.current;
      const fromIdx = order.indexOf(draggedKey);
      const toIdx = order.indexOf(hovered);
      if (fromIdx === -1 || toIdx === -1) return;
      reorderInPlace(draggedKey, fromIdx, toIdx);
    },
    // tx/ty are stable shared values
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reorderInPlace]
  );

  const order = workingOrder ?? items;

  return (
    <>
      <DragHint visible={!draggingKey} />
      <View
        style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 }}
      >
        {order.map((key) => (
          <DraggableCell
            key={key}
            itemKey={key}
            isDragging={draggingKey === key}
            tx={tx}
            ty={ty}
            scale={scale}
            onLayout={handleLayout(key)}
            onLiftStart={() => setDraggingKey(key)}
            onPanUpdate={() => hitTest(key)}
            onDragEnd={(commit) => finishDrag(commit)}
          >
            {renderItem(key, draggingKey === key)}
          </DraggableCell>
        ))}
      </View>
    </>
  );
}

/** One cell. Hooks defined at the component-top level so rules-of-hooks
 *  are satisfied. */
function DraggableCell<T extends string>({
  itemKey,
  isDragging,
  tx,
  ty,
  scale,
  children,
  onLayout,
  onLiftStart,
  onPanUpdate,
  onDragEnd,
}: {
  itemKey: T;
  isDragging: boolean;
  tx: SharedValue<number>;
  ty: SharedValue<number>;
  scale: SharedValue<number>;
  children: ReactNode;
  onLayout: (e: LayoutChangeEvent) => void;
  onLiftStart: () => void;
  onPanUpdate: () => void;
  onDragEnd: (commit: boolean) => void;
}) {
  // Reset shared values whenever this cell becomes the lifted one.
  useEffect(() => {
    if (isDragging) {
      cancelAnimation(tx);
      cancelAnimation(ty);
      cancelAnimation(scale);
      tx.value = 0;
      ty.value = 0;
      scale.value = withSpring(1.05, { damping: 14, stiffness: 220 });
    }
    // shared values are stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging]);

  const longPress = Gesture.LongPress()
    .minDuration(280)
    .maxDistance(20)
    .onStart(() => {
      "worklet";
      runOnJS(onLiftStart)();
    });

  const pan = Gesture.Pan()
    .activateAfterLongPress(280)
    .onUpdate((e) => {
      "worklet";
      tx.value = e.translationX;
      ty.value = e.translationY;
      runOnJS(onPanUpdate)();
    })
    .onEnd(() => {
      "worklet";
      tx.value = withSpring(0, { damping: 18, stiffness: 220 });
      ty.value = withSpring(0, { damping: 18, stiffness: 220 });
      scale.value = withSpring(1, { damping: 18, stiffness: 220 });
      runOnJS(onDragEnd)(true);
    })
    .onFinalize((_e, success) => {
      "worklet";
      if (!success) {
        tx.value = withSpring(0);
        ty.value = withSpring(0);
        scale.value = withSpring(1);
        runOnJS(onDragEnd)(false);
      }
    });

  const composed = Gesture.Simultaneous(longPress, pan);

  // Lifted chip translates/scales; non-lifted ones stay flat (zero
  // transform). The non-lifted style still has to be derived in a worklet
  // because shared values can only be read inside one. We branch on
  // isDragging to skip the math when we don't need it.
  const animatedStyle = useAnimatedStyle(() => {
    if (!isDragging) {
      return { transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }] };
    }
    return {
      transform: [
        { translateX: tx.value },
        { translateY: ty.value },
        { scale: scale.value },
      ],
    };
  });

  return (
    <View
      style={{
        width: "50%",
        padding: 6,
        // Lifted chip floats above its neighbours.
        zIndex: isDragging ? 50 : 1,
        elevation: isDragging ? 12 : 0,
      }}
      onLayout={onLayout}
    >
      <GestureDetector gesture={composed}>
        <Animated.View
          style={[
            {
              borderRadius: 16,
              shadowColor: "#0F172A",
              shadowOpacity: isDragging ? 0.18 : 0,
              shadowRadius: isDragging ? 14 : 0,
              shadowOffset: { width: 0, height: isDragging ? 8 : 0 },
            },
            animatedStyle,
          ]}
        >
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

/** Subtle "long-press to drag" hint above the grid. Stays visible
 *  whenever nothing is being dragged — small enough to ignore once the
 *  user has learned the gesture. */
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

/** Wrap any TouchableOpacity-based chip with this so taps are suppressed
 *  while the chip is mid-drag (otherwise releasing finger fires both
 *  drag-end and onPress). */
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
