import UIKit
import Social
import MobileCoreServices

class ShareViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Immediately start intercepting shared content
        handleSharedContent()
    }

    private func handleSharedContent() {
        guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem,
              let attachment = extensionItem.attachments?.first else {
            self.extensionContext?.cancelRequest(withError: NSError(domain: "ShareError", code: 0, userInfo: nil))
            return
        }
        
        let urlType = kUTTypeURL as String
        let textType = kUTTypePlainText as String
        let imageType = kUTTypeImage as String
        let movieType = kUTTypeMovie as String
        
        // 1. Check if the shared attachment is a direct Web URL
        if attachment.hasItemConformingToTypeIdentifier(urlType) {
            attachment.loadItem(forTypeIdentifier: urlType, options: nil) { [weak self] (item, error) in
                if let url = item as? URL {
                    self?.redirectToMainApp(with: url.absoluteString)
                } else {
                    self?.extensionContext?.cancelRequest(withError: NSError(domain: "ShareError", code: 1, userInfo: nil))
                }
            }
        }
        // 2. Check if the shared attachment is text (which might contain the URL)
        else if attachment.hasItemConformingToTypeIdentifier(textType) {
            attachment.loadItem(forTypeIdentifier: textType, options: nil) { [weak self] (item, error) in
                if let text = item as? String {
                    self?.redirectToMainApp(with: text)
                } else {
                    self?.extensionContext?.cancelRequest(withError: NSError(domain: "ShareError", code: 2, userInfo: nil))
                }
            }
        }
        // 3. Check if the shared attachment is an image
        else if attachment.hasItemConformingToTypeIdentifier(imageType) {
            attachment.loadItem(forTypeIdentifier: imageType, options: nil) { [weak self] (item, error) in
                if let url = item as? URL {
                    self?.redirectToMainApp(with: url.absoluteString)
                } else {
                    self?.redirectToMainApp(with: "scrollab://share?type=image")
                }
            }
        }
        // 4. Check if the shared attachment is a movie/video
        else if attachment.hasItemConformingToTypeIdentifier(movieType) {
            attachment.loadItem(forTypeIdentifier: movieType, options: nil) { [weak self] (item, error) in
                if let url = item as? URL {
                    self?.redirectToMainApp(with: url.absoluteString)
                } else {
                    self?.redirectToMainApp(with: "scrollab://share?type=movie")
                }
            }
        } else {
            self.extensionContext?.cancelRequest(withError: NSError(domain: "ShareError", code: 3, userInfo: nil))
        }
    }

    private func redirectToMainApp(with sharedText: String) {
        let urlString = sharedText.trimmingCharacters(in: .whitespacesAndNewlines)
        
        var deepLinkStr = ""
        if urlString.hasPrefix("scrollab://") {
            deepLinkStr = urlString
        } else {
            // Parse out any URLs (e.g. if shared text is "Check this out https://instagram.com/reel/...")
            var finalUrl = urlString
            if let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue) {
                let matches = detector.matches(in: urlString, options: [], range: NSRange(location: 0, length: urlString.utf16.count))
                if let firstMatch = matches.first, let range = Range(firstMatch.range, in: urlString) {
                    finalUrl = String(urlString[range])
                }
            }
            
            // URL-encode the link to make it query-parameter safe
            guard let encodedUrl = finalUrl.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) else {
                self.extensionContext?.cancelRequest(withError: NSError(domain: "ShareError", code: 4, userInfo: nil))
                return
            }
            
            // Construct the custom deep link scheme
            deepLinkStr = "scrollab://share?url=\(encodedUrl)"
        }
        
        if let url = URL(string: deepLinkStr) {
            // Traverse the responder chain to find the application instance and open the deep link
            var responder: UIResponder? = self
            while responder != nil {
                if let application = responder as? UIApplication {
                    application.perform(Selector(("openURL:")), with: url)
                    break
                }
                responder = responder?.next
            }
        }
        
        // Instantly complete and dismiss the share sheet extension
        self.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
    }
}
