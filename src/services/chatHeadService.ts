declare var floatingBubble: any;

export class ChatHeadService {
  /**
   * চ্যাট হেড চালু করা (Start Floating Chat Head)
   */
  public static startBubble() {
    if (typeof window !== 'undefined' && typeof (window as any).floatingBubble !== 'undefined') {
      try {
        (window as any).floatingBubble.showBubble(
          {
            icon: 'ic_launcher', // res/drawable ফোল্ডারের আইকন নাম
            x: 100,
            y: 200,
          },
          () => console.log('Chat head active!'),
          (err: any) => console.error('Failed to show chat head:', err)
        );
      } catch (err) {
        console.error('Error invoking floatingBubble.showBubble:', err);
      }
    } else if (typeof floatingBubble !== 'undefined') {
      try {
        floatingBubble.showBubble(
          {
            icon: 'ic_launcher',
            x: 100,
            y: 200,
          },
          () => console.log('Chat head active!'),
          (err: any) => console.error('Failed to show chat head:', err)
        );
      } catch (err) {
        console.error('Error in floatingBubble:', err);
      }
    } else {
      console.log('Floating bubble plugin initialized in web/hybrid mode.');
    }
  }

  /**
   * চ্যাট হেড হাইড করা (Hide Floating Chat Head)
   */
  public static hideBubble() {
    if (typeof window !== 'undefined' && typeof (window as any).floatingBubble !== 'undefined') {
      try {
        (window as any).floatingBubble.hideBubble();
      } catch (err) {
        console.error('Error hiding floatingBubble:', err);
      }
    } else if (typeof floatingBubble !== 'undefined') {
      try {
        floatingBubble.hideBubble();
      } catch (err) {
        console.error('Error hiding floatingBubble:', err);
      }
    }
  }
}
